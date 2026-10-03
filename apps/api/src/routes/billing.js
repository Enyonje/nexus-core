import { stripe } from "../stripe.js";
import { db } from "../db/db.js";

// Utility: get or create a Stripe customer for a user
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
  // Create a payment intent (one-time payment)
  app.post("/billing/create-payment-intent", async (req, reply) => {
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
  app.post("/billing/create-subscription", async (req, reply) => {
    const { priceId } = req.body;
    const userId = req.user.id; // assumes auth middleware sets req.user
    const email = req.user.email;

    try {
      // Ensure customer exists
      const customerId = await getOrCreateCustomer(userId, email);

      // Create subscription
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