import { stripe, getStripePriceId } from "../utils/stripe.js";

export async function stripeRoutes(server) {
  server.post("/create-checkout-session", async (req, reply) => {
    // Destructure tier and userId from the request body
    const { tier, userId } = req.body;

    try {
      // 1. Debugging: Log the incoming tier to ensure it's what you expect
      console.log(`[Stripe] Creating session for Tier: ${tier}, User: ${userId}`);

      const priceId = getStripePriceId(tier);

      // 2. Strict Validation: Check if the priceId is actually present
      if (!priceId || typeof priceId !== 'string') {
        console.error(`[Stripe Error] Resolved priceId is invalid: ${priceId}`);
        return reply.code(400).send({ 
          error: `Invalid tier: '${tier}'. Please ensure your Stripe Price IDs are configured correctly.` 
        });
      }

      // 3. Create Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"], // Explicitly define payment types
        mode: "subscription",
        line_items: [
          {
            price: priceId, // This is where the error was triggered
            quantity: 1,
          },
        ],
        // Allow Stripe to handle recurring payment logic
        subscription_data: {
          metadata: { userId: userId || "anonymous" },
        },
        success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing`,
        metadata: { userId: userId || "anonymous" },
      });

      // Return the URL for the frontend to redirect
      return { url: session.url };
      
    } catch (err) {
      // 4. Enhanced Logging: Catch the specific Stripe error details
      console.error("Stripe API Exception:", err.message);
      return reply.code(500).send({ 
        error: "Internal Server Error during checkout initialization.",
        details: err.message 
      });
    }
  });
}