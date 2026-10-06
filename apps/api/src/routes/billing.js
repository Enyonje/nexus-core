import { stripe } from "../stripe.js";
import { db } from "../db/db.js";

// Utility: get or create a Stripe customer for a user/organization
async function getOrCreateCustomer(userId, email) {
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
}

export async function billingRoutes(app) {
  /**
   * GET /plans (Mounted as /api/v1/billing/plans or /api/billing/plans)
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

      // Fallback defaults if DB hasn't been seeded yet
      if (rows.length === 0) {
        const defaultPlans = [
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
        return reply.send({ plans: defaultPlans, source: "default" });
      }

      return reply.send({ plans: rows, source: "database" });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch plans", message: err.message });
    }
  });

  // Create a payment intent (one-time payment)
  app.post("/create-payment-intent", async (req, reply) => {
    const { amount, currency } = req.body;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
      });

      reply.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });

  // Create a subscription (recurring plan)
  app.post("/create-subscription", async (req, reply) => {
    const { priceId } = req.body;

    if (!req.user) {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const userId = req.user.id;
    const email = req.user.email;

    try {
      const customerId = await getOrCreateCustomer(userId, email);

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      reply.send(subscription);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });
}

export default billingRoutes;