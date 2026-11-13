import { requireProductAuth } from "../auth/guard.js";
import { getProduct } from "../auth/products.js";
import { INTERVALS, planByKey, planRank, publicPlans, stripePriceId } from "./catalog.js";

const BILLING_ROLES = new Set(["owner", "admin", "billing"]);

function summary(sub) {
  const active = Boolean(sub && ["active", "trialing"].includes(sub.status));
  return {
    plan: active ? sub.plan_key : "free",
    status: sub?.status || "inactive",
    active,
    interval: sub?.interval || null,
    current_period_end: sub?.current_period_end || null,
    cancel_at_period_end: Boolean(sub?.cancel_at_period_end),
  };
}

/**
 * Billing endpoints for one product, mounted at /api/<product>/billing:
 *   GET  /plans          public plan list (same numbers the checkout charges)
 *   GET  /subscription   the signed-in workspace's plan for this product
 *   POST /checkout       { plan, interval } -> Stripe Checkout URL
 *   POST /portal         -> Stripe Billing Portal URL (change card, cancel, invoices)
 */
export function productBillingRoutes({ product: slug, store, getStripe, env = process.env }) {
  const product = getProduct(slug);
  const frontend = (env.FRONTEND_URL || "https://nexusthecore.com").replace(/\/$/, "");
  const auth = requireProductAuth(slug, { env });

  async function assertCanManageBilling(req) {
    if (req.user.role === "admin" || req.user.role === "owner") return;
    const orgRole = req.user.org_id ? await store.getMembershipRole(req.user.id, req.user.org_id) : null;
    if (!BILLING_ROLES.has(orgRole)) {
      const err = new Error("Only workspace owners, admins or billing members can change the plan.");
      err.status = 403;
      err.code = "BILLING_FORBIDDEN";
      throw err;
    }
  }

  async function ensureCustomer(stripe, org, email) {
    if (org.stripe_customer_id) return org.stripe_customer_id;
    const customer = await stripe.customers.create({ email, name: org.name, metadata: { org_id: org.id } });
    await store.setOrgStripeCustomer(org.id, customer.id);
    return customer.id;
  }

  const fail = (reply, err) =>
    reply.code(err.status || 500).send({ error: err.code || "BILLING_ERROR", message: err.status ? err.message : "Billing is temporarily unavailable." });

  return async function plugin(app) {
    app.get("/plans", async () => ({ product: slug, name: product.name, currency: "usd", intervals: INTERVALS, plans: publicPlans(slug, env) }));

    app.get("/subscription", { preHandler: auth }, async (req) => {
      const sub = req.user.org_id ? await store.getSubscription(req.user.org_id, slug) : null;
      return { product: slug, ...summary(sub) };
    });

    app.post("/checkout", { preHandler: auth, config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
      try {
        const planKey = String(req.body?.plan || req.body?.tier || "").toLowerCase();
        const interval = req.body?.interval === "annual" ? "annual" : "monthly";
        const plan = planByKey(slug, planKey);
        if (!plan) return reply.code(400).send({ error: "BILLING_UNKNOWN_PLAN", message: "Choose a valid plan." });
        if (plan.prices[interval].amount === 0) return reply.code(400).send({ error: "BILLING_FREE_PLAN", message: "The free plan does not need checkout." });

        await assertCanManageBilling(req);
        const priceId = stripePriceId(slug, plan.key, interval, env);
        if (!priceId) return reply.code(409).send({ error: "BILLING_CONTACT_SALES", message: `${plan.name} is not available for online checkout yet. Contact sales.` });
        const stripe = await getStripe(env);
        if (!stripe) return reply.code(503).send({ error: "BILLING_NOT_CONFIGURED", message: "Online payments are not configured." });

        const org = await store.getOrg(req.user.org_id);
        if (!org) return reply.code(400).send({ error: "BILLING_NO_WORKSPACE", message: "Your account has no workspace." });

        const current = await store.getSubscription(org.id, slug);
        if (current?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(current.status)) {
          if (planRank(slug, current.plan_key) === plan.rank) {
            return reply.code(409).send({ error: "BILLING_ALREADY_SUBSCRIBED", message: `You are already on ${plan.name}.` });
          }
        }

        const customer = await ensureCustomer(stripe, org, req.user.email);
        const metadata = { product: slug, org_id: org.id, user_id: req.user.id, plan: plan.key, interval };
        const base = slug === "nexus-core" ? "" : `/${slug}`;
        // An existing paid subscription is changed in the portal so proration is handled by Stripe.
        if (current?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(current.status)) {
          const portal = await stripe.billingPortal.sessions.create({ customer, return_url: `${frontend}${base}/billing` });
          return reply.send({ url: portal.url, mode: "portal" });
        }
        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer,
          client_reference_id: org.id,
          line_items: [{ price: priceId, quantity: 1 }],
          allow_promotion_codes: true,
          success_url: `${frontend}${base}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontend}${base}/pricing?checkout=canceled`,
          metadata,
          subscription_data: { metadata },
        }, { idempotencyKey: `checkout:${org.id}:${slug}:${plan.key}:${interval}:${Math.floor(Date.now() / 60000)}` });
        await store.audit(req.user.id, "checkout_started", metadata);
        return reply.send({ url: session.url, mode: "checkout" });
      } catch (err) {
        req.log.error(err);
        return fail(reply, err);
      }
    });

    app.post("/portal", { preHandler: auth }, async (req, reply) => {
      try {
        await assertCanManageBilling(req);
        const stripe = await getStripe(env);
        if (!stripe) return reply.code(503).send({ error: "BILLING_NOT_CONFIGURED", message: "Online payments are not configured." });
        const org = await store.getOrg(req.user.org_id);
        if (!org?.stripe_customer_id) return reply.code(409).send({ error: "BILLING_NO_CUSTOMER", message: "There is no billing account yet. Choose a plan first." });
        const base = slug === "nexus-core" ? "" : `/${slug}`;
        const portal = await stripe.billingPortal.sessions.create({ customer: org.stripe_customer_id, return_url: `${frontend}${base}/billing` });
        return reply.send({ url: portal.url });
      } catch (err) {
        req.log.error(err);
        return fail(reply, err);
      }
    });
  };
}

/** preHandler: blocks unless the caller's workspace has an active plan at or above `minPlan` for this product. */
export function requirePlan(slug, minPlan, store) {
  const needed = planRank(slug, minPlan);
  return async function planGuard(req, reply) {
    const sub = req.user?.org_id ? await store.getSubscription(req.user.org_id, slug) : null;
    const active = sub && ["active", "trialing"].includes(sub.status);
    const rank = active ? planRank(slug, sub.plan_key) : 0;
    if (rank < needed) {
      return reply.code(402).send({ error: "PLAN_REQUIRED", message: `This needs the ${planByKey(slug, minPlan)?.name || minPlan} plan or higher.`, requiredPlan: minPlan });
    }
  };
}
