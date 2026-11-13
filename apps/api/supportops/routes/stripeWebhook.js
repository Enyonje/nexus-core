/**
 * Stripe Webhook Routes
 * Path: supportops/routes/stripeWebhookRoutes.js
 */

import stripe from "../lib/stripe.js";

export default async function stripeWebhookRoutes(app) {
  // Stripe requires raw body for signature verification
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    done(null, body);
  });

  app.post("/", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body, // raw buffer
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      req.log.error("Webhook signature verification failed:", err.message);
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle events
    switch (event.type) {
      case "invoice.payment_failed":
        console.log("❌ Payment failed:", event.data.object.customer);
        break;
      case "invoice.paid":
        console.log("✅ Invoice paid:", event.data.object.customer);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return reply.send({ received: true });
  });
}

// Named exports for backward compatibility
export { stripeWebhookRoutes };
export const webhookRoutes = stripeWebhookRoutes;
