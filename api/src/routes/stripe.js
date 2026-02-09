import { stripe, getStripePriceId } from "../utils/stripe.js";

export async function stripeRoutes(server) {
  server.post("/create-checkout-session", async (req, reply) => {
    const { tier, userId } = req.body;

    try {
      // getStripePriceId must return a valid Stripe Price ID (e.g. "price_abc123")
      const priceId = getStripePriceId(tier);

      if (!priceId) {
        return reply.code(400).send({ error: "Invalid tier or missing priceId" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: priceId,   // ✅ must be a valid Stripe Price ID
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL}/subscription?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
        metadata: { userId: userId || "anonymous" },
      });

      return { url: session.url };
    } catch (err) {
      console.error("Stripe checkout error:", err.message);
      return reply.code(400).send({ error: err.message });
    }
  });
}