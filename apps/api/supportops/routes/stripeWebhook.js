/**
 * Stripe Webhook Routes
 * Path: supportops/routes/stripeWebhookRoutes.js
 */

import express from "express";
import stripe from "../lib/stripe.js";

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "invoice.payment_failed") {
      console.log("❌ Payment failed:", event.data.object.customer);
    }

    if (event.type === "invoice.paid") {
      console.log("✅ Invoice paid");
    }

    res.json({ received: true });
  }
);

// Named exports to satisfy named imports like:
// import { stripeWebhookRoutes } from "..."
// import { webhookRoutes } from "..."
export const stripeWebhookRoutes = router;
export const webhookRoutes = router;

// Default export to satisfy default imports
export default router;