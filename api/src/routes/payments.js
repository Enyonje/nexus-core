// src/routes/payments.js
import Stripe from "stripe";
import { db } from "../db/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function paymentsRoutes(server) {
  // Create a checkout session
  server.post("/create-checkout-session", async (req, reply) => {
    const { priceId, userId } = req.body; // priceId from Stripe dashboard

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
        metadata: { userId },
      });

      return { url: session.url };
    } catch (err) {
      reply.code(500).send({ error: err.message });
    }
  });

  // Stripe webhook to handle events
  server.post("/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.userId;

      await db.query(
        `UPDATE users SET subscription = $1 WHERE id = $2`,
        ["pro", userId]
      );
      console.log(`✅ User ${userId} upgraded to pro`);
    }

    reply.send({ received: true });
  });
}