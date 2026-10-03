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

export default router;
