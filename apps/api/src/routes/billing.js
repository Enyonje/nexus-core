// apps/api/supportops/routes/billingRoutes.js
// Unified Billing & Subscriptions Router (Prisma + Stripe)
// Register: await app.register(billingRoutes, { prefix: "/api/v1/billing" });

import { prisma } from "../config/prisma.js";
import { requireAuth } from "../security/authMiddleware.js";
import { AccessError, invalidateSubscription } from "./entitlements.js";
import { mapStripeStatus, trialEnd } from "../supportops/security/entitlementRules.js";

const stripe = async () => {
  const { default: Stripe } = await import("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const fail = (reply, e) =>
  e instanceof AccessError ? reply.code(e.status).send({ error: e.code, message: e.message }) : null;

// Only owner, admin or billing contacts can modify workspace billing
async function billingOrg(req) {
  const orgId = req.headers["x-org-id"];
  const m = await prisma.membership.findFirst({
    where: {
      user_id: req.user.id,
      ...(orgId ? { org_id: orgId } : { org: { type: "PERSONAL" } }),
      org_role: { in: ["owner", "admin", "billing"] },
    },
    include: { org: true },
  });
  if (!m) {
    throw new AccessError(
      403,
      "BILLING_FORBIDDEN",
      "Only an owner, admin or billing contact can change the plan"
    );
  }
  return m.org;
}

// Utility: get or create Stripe customer for a user/organization
async function getOrCreateCustomer(userId, email, orgName = "Workspace") {
  try {
    const s = await stripe();
    const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
    if (user?.stripe_customer_id) {
      return user.stripe_customer_id;
    }

    const customer = await s.customers.create({
      email,
      name: orgName,
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripe_customer_id: customer.id },
    }).catch(() => { });

    return customer.id;
  } catch (err) {
    const s = await stripe();
    const customer = await s.customers.create({ email });
    return customer.id;
  }
}

const DEFAULT_PLANS = [
  {
    id: "plan_free_default",
    key: "free",
    name: "Free Tier",
    price_cents: 0,
    currency: "usd",
    features: ["Up to 100 AI responses/mo", "Community Support", "Basic Analytics"],
    limits: { ai_calls: 100, seats: 1 },
    stripe_price_id: null,
  },
  {
    id: "plan_pro_default",
    key: "pro",
    name: "Pro Tier",
    price_cents: 2900,
    currency: "usd",
    features: ["Unlimited AI resolutions", "Priority Agent Routing", "Custom Ticket Rules"],
    limits: { ai_calls: 10000, seats: 5 },
    stripe_price_id: process.env.STRIPE_PRO_PRICE_ID || "price_pro_default",
  },
  {
    id: "plan_enterprise_default",
    key: "enterprise",
    name: "Enterprise",
    price_cents: 9900,
    currency: "usd",
    features: ["Dedicated SLA", "Custom Integrations", "Unlimited Seats"],
    limits: { ai_calls: -1, seats: -1 },
    stripe_price_id: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise_default",
  },
];

export async function billingRoutes(app) {
  // 1. GET /plans - Resolves database plans with fallback to defaults
  app.get("/plans", async (req, reply) => {
    const slug = req.query?.app || req.query?.slug || "supportops";
    try {
      const apps = await prisma.app.findMany({
        where: { active: true, ...(slug ? { slug } : {}) },
        include: { plans: { where: { active: true } }, addons: true },
      });

      if (!apps || apps.length === 0) {
        return reply.send({ plans: DEFAULT_PLANS, source: "default" });
      }

      return reply.send({
        source: "database",
        apps: apps.map((a) => ({
          app: a.slug,
          name: a.name,
          plans: a.plans.map(({ key, name, price_cents, features, limits }) => ({
            key,
            name,
            priceCents: price_cents,
            features,
            limits,
          })),
          addons: a.addons.map(({ key, name, price_cents, features }) => ({
            key,
            name,
            priceCents: price_cents,
            features,
          })),
        })),
      });
    } catch (err) {
      req.log?.warn("[Billing Plans] DB query failed, serving defaults:", err.message);
      return reply.send({ plans: DEFAULT_PLANS, source: "fallback" });
    }
  });

  // 2. POST /create-payment-intent (One-time payment)
  app.post("/create-payment-intent", async (req, reply) => {
    const { amount, currency = "usd" } = req.body || {};
    try {
      const s = await stripe();
      const paymentIntent = await s.paymentIntents.create({
        amount: amount || 1000,
        currency,
        automatic_payment_methods: { enabled: true },
      });
      return reply.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // 3. POST /create-subscription (Recurring plan via intent)
  app.post("/create-subscription", { preHandler: requireAuth }, async (req, reply) => {
    const { priceId } = req.body || {};
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    try {
      const customerId = await getOrCreateCustomer(userId, email);
      const s = await stripe();
      const subscription = await s.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId || process.env.STRIPE_PRO_PRICE_ID || "price_pro_default" }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });
      return reply.send(subscription);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // 4. POST /guest-checkout (Guest-first direct checkout & workspace provisioning)
  app.post("/guest-checkout", async (req, reply) => {
    try {
      const {
        email,
        workspaceName,
        fullName,
        app: slug = "supportops",
        plan: planKey = "pro",
        mode = "checkout",
        addons = [],
        priceId,
      } = req.body ?? {};

      if (!email || !workspaceName) {
        return reply.code(400).send({
          error: "MISSING_FIELDS",
          message: "Email and workspace name are required.",
        });
      }

      // 1. Provision or locate User record
      const cleanEmail = email.trim().toLowerCase();
      let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: cleanEmail,
            name: fullName?.trim() || cleanEmail.split("@")[0],
          },
        });
      }

      // 2. Provision new workspace / Organization
      const org = await prisma.organization.create({
        data: {
          name: workspaceName.trim(),
          type: "TEAM",
          memberships: {
            create: {
              user_id: user.id,
              org_role: "owner",
            },
          },
        },
      });

      // 3. Retrieve target App & Plan
      const targetApp = await prisma.app.findUnique({
        where: { slug },
        include: { plans: true, addons: true },
      });

      const plan = targetApp?.plans?.find((p) => p.key === planKey);

      // Handle Trial Mode Request
      if (mode === "trial") {
        const growthPlan = targetApp?.plans?.find((p) => p.key === "growth") || plan;
        if (targetApp && growthPlan) {
          await prisma.subscription.create({
            data: {
              org_id: org.id,
              app_id: targetApp.id,
              plan_id: growthPlan.id,
              status: "trialing",
              trial_ends_at: trialEnd(),
              limit_overrides: { ai_resolutions: 100 },
            },
          });

          await prisma.appAccess.create({
            data: {
              org_id: org.id,
              user_id: user.id,
              app_id: targetApp.id,
              app_role: "admin",
            },
          });
        }

        const token = app.jwt ? app.jwt.sign({ id: user.id, orgId: org.id }) : null;
        return reply.code(201).send({
          success: true,
          token,
          orgId: org.id,
          url: `${process.env.APP_URL || ""}/nexus`,
        });
      }

      const targetPriceId = priceId || plan?.stripe_price_id || process.env.STRIPE_PRO_PRICE_ID;
      const chosenAddons = targetApp?.addons?.filter(
        (x) => addons.includes(x.key) && x.stripe_price_id
      ) || [];

      const s = await stripe();
      const customerId = await getOrCreateCustomer(user.id, cleanEmail, org.name);

      await prisma.organization.update({
        where: { id: org.id },
        data: { stripe_customer_id: customerId },
      });

      const metadata = {
        orgId: org.id,
        userId: user.id,
        appSlug: slug,
        planKey,
        addons: chosenAddons.map((x) => x.key).join(","),
      };

      const session = await s.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [
          { price: targetPriceId, quantity: 1 },
          ...chosenAddons.map((x) => ({ price: x.stripe_price_id, quantity: 1 })),
        ],
        subscription_data: { metadata },
        metadata,
        success_url: `${process.env.APP_URL || "https://nexusthecore.com"}/nexus?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || "https://nexusthecore.com"}/pricing`,
      });

      const token = app.jwt ? app.jwt.sign({ id: user.id, orgId: org.id }) : null;
      return reply.send({ url: session.url, sessionId: session.id, token });
    } catch (e) {
      if (fail(reply, e)) return;
      req.log?.error(e);
      return reply.code(500).send({ error: "GUEST_CHECKOUT_FAILED", message: e.message });
    }
  });

  // 5. POST /trial - Authenticated 14-day trial
  app.post("/trial", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const org = await billingOrg(req);
      const sup = await prisma.app.findUnique({
        where: { slug: req.body?.app ?? "supportops" },
        include: { plans: true },
      });
      const plan = sup?.plans.find((p) => p.key === "growth" || p.key === "pro");
      if (!plan) return reply.code(404).send({ message: "No trial is available for this app" });

      const existingSub = await prisma.subscription.findUnique({
        where: { org_id_app_id: { org_id: org.id, app_id: sup.id } },
      }).catch(() => null);

      if (existingSub) {
        return reply.code(409).send({
          error: "ALREADY_SUBSCRIBED",
          message: "This workspace already has a subscription or used its trial",
        });
      }

      await prisma.subscription.create({
        data: {
          org_id: org.id,
          app_id: sup.id,
          plan_id: plan.id,
          status: "trialing",
          trial_ends_at: trialEnd(),
          limit_overrides: { ai_resolutions: 100 },
        },
      });

      await prisma.appAccess.upsert({
        where: {
          org_id_user_id_app_id: { org_id: org.id, user_id: req.user.id, app_id: sup.id },
        },
        update: {},
        create: { org_id: org.id, user_id: req.user.id, app_id: sup.id, app_role: "admin" },
      });

      return reply.code(201).send({ ok: true, trialEndsAt: trialEnd() });
    } catch (e) {
      if (fail(reply, e)) return;
      throw e;
    }
  });

  // 6. POST /checkout - Authenticated checkout for existing workspace
  app.post("/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const org = await billingOrg(req);
      const { app: slug = "supportops", plan: planKey = "pro", addons = [], priceId } = req.body ?? {};

      const a = await prisma.app.findUnique({
        where: { slug },
        include: { plans: true, addons: true },
      });
      const plan = a?.plans.find((p) => p.key === planKey);
      const targetPriceId = priceId || plan?.stripe_price_id || process.env.STRIPE_PRO_PRICE_ID;

      if (!targetPriceId) {
        return reply.code(400).send({
          message: "That plan is not available for self-serve checkout. Contact sales.",
        });
      }

      const chosen = a?.addons?.filter((x) => addons.includes(x.key) && x.stripe_price_id) || [];

      const s = await stripe();
      let customer = org.stripe_customer_id;
      if (!customer) {
        customer = (
          await s.customers.create({ name: org.name, metadata: { orgId: org.id } })
        ).id;
        await prisma.organization.update({
          where: { id: org.id },
          data: { stripe_customer_id: customer },
        });
      }

      const metadata = {
        orgId: org.id,
        userId: req.user.id,
        appSlug: slug,
        planKey,
        addons: chosen.map((x) => x.key).join(","),
      };

      const session = await s.checkout.sessions.create({
        mode: "subscription",
        customer,
        line_items: [
          { price: targetPriceId, quantity: 1 },
          ...chosen.map((x) => ({ price: x.stripe_price_id, quantity: 1 })),
        ],
        subscription_data: { metadata },
        metadata,
        success_url: `${process.env.APP_URL || "https://nexusthecore.com"}/nexus`,
        cancel_url: `${process.env.APP_URL || "https://nexusthecore.com"}/pricing`,
      });

      return { url: session.url };
    } catch (e) {
      if (fail(reply, e)) return;
      throw e;
    }
  });
}

/* ---------- Stripe Webhook Plugin ---------- */
export async function stripeWebhookPlugin(app) {
  if (app.hasContentTypeParser("application/json")) {
    app.removeContentTypeParser("application/json");
  }
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) =>
    done(null, body)
  );

  app.post("/stripe", async (req, reply) => {
    let event;
    try {
      const s = await stripe();
      event = s.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return reply.code(400).send({ message: "Invalid signature" });
    }

    try {
      await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
    } catch (err) {
      if (err.code === "P2002") return { received: true, duplicate: true };
      throw err;
    }

    try {
      const obj = event.data.object;
      if (
        [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ].includes(event.type)
      ) {
        await syncSubscription(obj, event.type === "customer.subscription.deleted");
      } else if (event.type === "invoice.payment_failed" && obj.subscription) {
        await prisma.subscription.updateMany({
          where: { stripe_subscription_id: obj.subscription },
          data: { status: "past_due" },
        });
      }
    } catch (err) {
      await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => { });
      throw err;
    }
    return { received: true };
  });
}

async function syncSubscription(sub, deleted) {
  const { orgId, userId, appSlug, planKey, addons = "" } = sub.metadata ?? {};
  if (!orgId || !appSlug || !planKey) return;

  const app = await prisma.app.findUnique({
    where: { slug: appSlug },
    include: { plans: true, addons: true },
  });
  const plan = app?.plans.find((p) => p.key === planKey);
  if (!plan) return;

  const status = deleted ? "canceled" : mapStripeStatus(sub.status);
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  const data = {
    plan_id: plan.id,
    status,
    quantity: 1,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
    stripe_subscription_id: sub.id,
    ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000) } : {}),
    ...(status === "active" ? { limit_overrides: null, trial_ends_at: null } : {}),
  };

  const row = await prisma.subscription.upsert({
    where: { org_id_app_id: { org_id: orgId, app_id: app.id } },
    update: data,
    create: { org_id: orgId, app_id: app.id, ...data },
  });

  const wanted = app.addons.filter((a) => addons.split(",").includes(a.key));
  await prisma.subscriptionAddon.deleteMany({
    where: { subscription_id: row.id, addon_id: { notIn: wanted.map((a) => a.id) } },
  });

  for (const a of wanted) {
    await prisma.subscriptionAddon.upsert({
      where: { subscription_id_addon_id: { subscription_id: row.id, addon_id: a.id } },
      update: {},
      create: { subscription_id: row.id, addon_id: a.id },
    });
  }

  if (userId) {
    await prisma.appAccess.upsert({
      where: { org_id_user_id_app_id: { org_id: orgId, user_id: userId, app_id: app.id } },
      update: {},
      create: {
        org_id: orgId,
        user_id: userId,
        app_id: app.id,
        app_role: app.roles?.includes("admin") ? "admin" : app.default_role || "member",
      },
    });
  }
  invalidateSubscription(orgId, app.id);
}

export default billingRoutes;