import { stripe, getStripePriceId } from "../utils/stripe.js";

export async function stripeRoutes(server) {
  server.post("/create-checkout-session", async (req, reply) => {
    const { tier, userId } = req.body;

    try {
      console.log(`[Stripe] Creating session for Tier: ${tier}, User: ${userId}`);

      // Resolve the Price ID from utils/stripe.js
      const priceId = getStripePriceId(tier);

      if (!priceId || typeof priceId !== "string") {
        console.error(`[Stripe Error] Invalid priceId for tier '${tier}':`, priceId);
        return reply.code(400).send({
          error: `Invalid tier '${tier}'. Check STRIPE_PRO_PRICE_ID and STRIPE_ENTERPRISE_PRICE_ID in your environment.`,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId, // ✅ guaranteed to be a string
            quantity: 1,
          },
        ],
        customer_email: req.user?.email || undefined, // optional, if you have auth
        success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing`,
        metadata: { userId: userId || "anonymous", tier },
      });

      return reply.send({ url: session.url });
    } catch (err) {
      console.error("Stripe API Exception:", err);
      return reply.code(500).send({
        error: "Internal Server Error during checkout initialization.",
        details: err.message,
      });
    }
  });
}
