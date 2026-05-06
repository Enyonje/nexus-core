import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

function getStripePriceId(tier) {
  if (!tier) return undefined;
  const t = tier.toLowerCase().trim();
  const map = {
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  };
  return map[t];
}

// Named export instead of default
export async function paymentsRoutes(server) {
  server.post("/payments/create-checkout-session", async (req, reply) => {
    try {
      console.log("create-checkout-session body:", req.body);

      const { tier } = req.body || {};
      const priceId = getStripePriceId(tier);

      console.log("Resolved priceId for tier", tier, "=>", priceId);

      if (!priceId) {
        return reply
          .code(400)
          .send({ error: "Invalid tier or missing STRIPE_*_PRICE_ID env var" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.FRONTEND_URL}/subscription?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription?canceled=true`,
        metadata: { requested_tier: tier },
      });

      return reply.send({ url: session.url });
    } catch (err) {
      console.error("Stripe create session error:", err);
      return reply
        .code(500)
        .send({ error: err.message || "Stripe session creation failed" });
    }
  });
}
