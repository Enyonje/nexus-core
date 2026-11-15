// routes/webhooks.js
export async function webhooksRoutes(server) {
  server.post("/api/webhooks/stripe", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return reply.code(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        console.log("Checkout session completed:", session.id);
        // TODO: update user subscription in DB
        break;
      // Add other event types you care about
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    reply.send({ received: true });
  });
}
