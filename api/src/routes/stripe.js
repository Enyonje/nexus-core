import { stripe, getStripePriceId } from "../utils/stripe.js";

export async function stripeRoutes(server) {
  server.post("/create-checkout-session", async (req, reply) => {
    const { tier, userId } = req.body; // ✅ read from body

    try {
      const priceId = getStripePriceId(tier);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/subscription?success=true`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
        metadata: {
          userId: userId || "anonymous", // ✅ safe fallback
        },
      });

      return { url: session.url };
    } catch (err) {
      console.error("Stripe checkout error:", err.message);
      return reply.code(400).send({ error: err.message });
    }
  });
}