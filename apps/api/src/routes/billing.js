// src/routes/billing.js
import { stripe } from "../stripe.js";
import { db } from "../db/db.js";
import { requireAuth } from "../security/authMiddleware.js";

// Utility: get or create a Stripe customer for a user/organization
async function getOrCreateCustomer(userId, email) {
  try {
    const { rows } = await db.query(
      `SELECT stripe_customer_id FROM users WHERE id = $1`,
      [userId]
    );
    const existingId = rows[0]?.stripe_customer_id;

    if (existingId) return existingId;

    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    await db.query(
      `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
      [customer.id, userId]
    );

    return customer.id;
  } catch (err) {
    console.warn("Customer creation warning:", err.message);
    // Fallback ephemeral customer if DB table is restricted
    const customer = await stripe.customers.create({ email });
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
    stripe_price_id: "price_pro_default",
  },
  {
    id: "plan_enterprise_default",
    key: "enterprise",
    name: "Enterprise",
    price_cents: 9900,
    currency: "usd",
    features: ["Dedicated SLA", "Custom Integrations", "Unlimited Seats"],
    limits: { ai_calls: -1, seats: -1 },
    stripe_price_id: "price_enterprise_default",
  },
];

export async function billingRoutes(app) {
  /**
   * GET /plans
   * Resolves plans for a given app slug (e.g. ?app=supportops)
   */
  app.get("/plans", async (req, reply) => {
    const { app: appSlug } = req.query;

    try {
      let queryText = `
        SELECT p.id, p.key, p.name, p.audience, p.billing_model, 
               p.features, p.limits, p.price_cents, p.currency, 
               p.stripe_price_id, a.slug as app_slug
        FROM plans p
        JOIN apps a ON p.app_id = a.id
        WHERE p.active = true
      `;
      const queryParams = [];

      if (appSlug) {
        queryText += ` AND a.slug = $1`;
        queryParams.push(appSlug);
      }

      const { rows } = await db.query(queryText, queryParams);

      if (!rows || rows.length === 0) {
        return reply.send({ plans: DEFAULT_PLANS, source: "default" });
      }

      return reply.send({ plans: rows, source: "database" });
    } catch (err) {
      // Graceful fallback if tables are not yet initialized in Postgres
      console.warn("[Billing Plans] DB query failed, serving defaults:", err.message);
      return reply.send({ plans: DEFAULT_PLANS, source: "fallback" });
    }
  });

  // Create a payment intent (one-time payment)
  app.post("/create-payment-intent", async (req, reply) => {
    const { amount, currency = "usd" } = req.body || {};

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount || 1000,
        currency,
        automatic_payment_methods: { enabled: true },
      });

      return reply.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Create a subscription (recurring plan) - Protected by requireAuth
  app.post("/create-subscription", { preHandler: requireAuth }, async (req, reply) => {
    const { priceId } = req.body || {};
    const userId = req.user?.id;
    const email = req.user?.email;

    if (!userId || !email) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    try {
      const customerId = await getOrCreateCustomer(userId, email);

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId || "price_pro_default" }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      return reply.send(subscription);
    } catch (err) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // Guest-first checkout session flow
  app.post("/guest-checkout", async (req, reply) => {
    const { email, tier, priceId } = req.body || {};

    if (!email) {
      return reply.code(400).send({ error: "Email is required for guest checkout" });
    }

    try {
      const customerId = await getOrCreateCustomer("guest_" + Date.now(), email);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId || "price_pro_default",
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin || "https://nexusthecore.com"}/nexus?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin || "https://nexusthecore.com"}/pricing`,
        metadata: { tier: tier || "pro", guestEmail: email },
      });

      return reply.send({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("Guest checkout error:", err);
      return reply.code(400).send({ error: err.message });
    }
  });
}

export default billingRoutes;