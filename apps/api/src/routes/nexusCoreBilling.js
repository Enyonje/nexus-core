// Nexus Core billing only. SupportOps billing remains in supportops/routes/billingRoutes.js.
import Stripe from "stripe";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../security/authMiddleware.js";

const APP_SLUG = "nexus-core";
const APP_URL = (process.env.APP_URL || "https://nexusthecore.com").replace(/\/$/, "");

const CATALOG = [
  {
    key: "free", name: "Free", description: "Explore agents and run small workflows.", popular: false,
    features: ["5 goals", "3 executions per day", "Community support"],
    prices: { monthly: { amount: 0 }, annual: { amount: 0 } },
  },
  {
    key: "starter", name: "Starter", description: "For individual builders and small workflows.", popular: false,
    features: ["Up to 5 active agents", "10,000 execution credits / month", "Standard support", "Basic analytics"],
    prices: { monthly: { amount: 29 }, annual: { amount: 23 } },
  },
  {
    key: "pro", name: "Pro", description: "For teams running multi-agent workflows.", popular: true,
    features: ["Unlimited active agents", "100,000 execution credits / month", "Live execution stream", "Advanced audit logs", "Priority support"],
    prices: { monthly: { amount: 79 }, annual: { amount: 63 } },
  },
  {
    key: "enterprise", name: "Enterprise", description: "Custom infrastructure, SSO and an SLA.", popular: false,
    features: ["Custom execution credits", "Dedicated database", "Custom agent integrations", "SLA & priority support", "Role-based access management"],
    prices: { monthly: { amount: 249 }, annual: { amount: 199 } },
  },
];

function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error("Stripe billing is not configured on this server.");
    error.statusCode = 503;
    throw error;
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function sendError(req, reply, error, fallback) {
  req.log?.error({ err: error }, fallback);
  const status = Number(error.statusCode) || 500;
  return reply.code(status).send({
    error: status >= 500 ? fallback : error.message,
    message: error.message,
  });
}

async function getMembership(userId, orgId, billingWrite = false) {
  const membership = await prisma.membership.findFirst({
    where: {
      user_id: userId,
      ...(orgId ? { org_id: orgId } : {}),
      ...(billingWrite ? { org_role: { in: ["owner", "admin", "billing"] } } : {}),
    },
    include: { org: true },
    orderBy: { created_at: "asc" },
  });
  return membership;
}

async function getNexusApp() {
  return prisma.app.findUnique({ where: { slug: APP_SLUG } });
}

function priceIdFor(plan, interval) {
  const suffix = interval === "annual" ? "ANNUAL" : "MONTHLY";
  const envNames = {
    starter: [`STRIPE_NEXUS_STARTER_${suffix}_PRICE_ID`],
    pro: interval === "annual"
      ? ["STRIPE_NEXUS_PRO_ANNUAL_PRICE_ID", "STRIPE_PRO_ANNUAL_PRICE_ID"]
      : ["STRIPE_NEXUS_PRO_MONTHLY_PRICE_ID", "STRIPE_PRO_PRICE_ID"],
    enterprise: interval === "annual"
      ? ["STRIPE_NEXUS_ENTERPRISE_ANNUAL_PRICE_ID", "STRIPE_ENTERPRISE_ANNUAL_PRICE_ID"]
      : ["STRIPE_NEXUS_ENTERPRISE_MONTHLY_PRICE_ID", "STRIPE_ENTERPRISE_PRICE_ID"],
  };
  for (const name of envNames[plan] || []) {
    if (process.env[name]) return process.env[name];
  }
  return null;
}

async function getOrCreateCustomer(stripe, org, user) {
  if (org.stripe_customer_id) return org.stripe_customer_id;
  const customer = await stripe.customers.create({
    email: user.email,
    name: org.name,
    metadata: { orgId: org.id, userId: user.id, appSlug: APP_SLUG },
  });
  await prisma.organization.update({
    where: { id: org.id },
    data: { stripe_customer_id: customer.id },
  });
  return customer.id;
}

export async function nexusCoreBillingRoutes(app) {
  // Public product pricing catalogue; it does not expose SupportOps plans.
  app.get("/billing/plans", async () => ({ plans: CATALOG, source: "nexus-core" }));

  app.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const membership = await getMembership(req.user.id, req.user.org_id, false);
      if (!membership) {
        return { plan: "free", status: "inactive", active: false, cancel_at_period_end: false, current_period_end: null };
      }
      const product = await getNexusApp();
      if (!product) {
        return { plan: "free", status: "inactive", active: false, cancel_at_period_end: false, current_period_end: null };
      }
      const subscription = await prisma.subscription.findUnique({
        where: { org_id_app_id: { org_id: membership.org_id, app_id: product.id } },
        include: { plan: true },
      });
      if (!subscription) {
        return { plan: "free", status: "inactive", active: false, cancel_at_period_end: false, current_period_end: null };
      }
      const active = ["active", "trialing"].includes(subscription.status);
      return {
        plan: subscription.plan?.key || "free",
        status: subscription.status || "inactive",
        active,
        interval: subscription.plan?.billing_model === "PER_SEAT" ? "monthly" : undefined,
        cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        current_period_end: subscription.current_period_end,
        trial_ends_at: subscription.trial_ends_at,
      };
    } catch (error) {
      return sendError(req, reply, error, "NEXUS_SUBSCRIPTION_LOAD_FAILED");
    }
  });

  app.post("/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const membership = await getMembership(req.user.id, req.user.org_id, true);
      if (!membership) return reply.code(403).send({ error: "BILLING_FORBIDDEN", message: "Workspace owner, admin or billing contact required." });

      const planKey = String(req.body?.plan || "").toLowerCase();
      const interval = req.body?.interval === "annual" ? "annual" : "monthly";
      const selectedPlan = CATALOG.find((plan) => plan.key === planKey);
      if (!selectedPlan || planKey === "free") {
        return reply.code(400).send({ error: "INVALID_PLAN", message: "Select a paid Nexus Core plan." });
      }
      const priceId = priceIdFor(planKey, interval);
      if (!priceId) {
        return reply.code(503).send({
          error: "STRIPE_PRICE_NOT_CONFIGURED",
          message: `Stripe price for Nexus Core ${planKey} (${interval}) is not configured. Set the matching Stripe price ID environment variable.`,
        });
      }

      const stripe = stripeClient();
      const customerId = await getOrCreateCustomer(stripe, membership.org, req.user);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: membership.org_id,
        metadata: { appSlug: APP_SLUG, orgId: membership.org_id, userId: req.user.id, planKey, interval },
        subscription_data: { metadata: { appSlug: APP_SLUG, orgId: membership.org_id, userId: req.user.id, planKey, interval } },
        success_url: `${APP_URL}/billing?checkout=success`,
        cancel_url: `${APP_URL}/pricing?checkout=canceled`,
      });
      return { url: session.url, sessionId: session.id };
    } catch (error) {
      return sendError(req, reply, error, "NEXUS_CHECKOUT_FAILED");
    }
  });

  app.post("/portal", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const membership = await getMembership(req.user.id, req.user.org_id, true);
      if (!membership) return reply.code(403).send({ error: "BILLING_FORBIDDEN", message: "Workspace owner, admin or billing contact required." });
      if (!membership.org.stripe_customer_id) {
        return reply.code(404).send({ error: "STRIPE_CUSTOMER_NOT_FOUND", message: "No Stripe billing customer exists for this workspace yet." });
      }
      const stripe = stripeClient();
      const session = await stripe.billingPortal.sessions.create({
        customer: membership.org.stripe_customer_id,
        return_url: `${APP_URL}/billing`,
      });
      return { url: session.url };
    } catch (error) {
      return sendError(req, reply, error, "NEXUS_PORTAL_FAILED");
    }
  });
}

export default nexusCoreBillingRoutes;
