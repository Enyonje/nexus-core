import { stripe, getStripePriceId } from "../utils/stripe.js";

export async function stripeRoutes(server) {
  // Register under /api/stripe prefix for clarity
  server.post("/api/stripe/create-checkout-session", async (req, reply) => {
    const { tier, userId } = req.body;

    const priceId = getStripePriceId(tier);
    if (!priceId) {
      return reply.code(400).send({ error: "Invalid tier or missing Price ID" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription`,
        metadata: { userId },
      });

      return reply.send({ url: session.url });
    } catch (err) {
      console.error("Stripe error:", err.message);
      return reply.code(500).send({ error: err.message });
    }
  });
}
