import { PRODUCTS } from "../auth/products.js";
import { planForPriceId } from "./catalog.js";

const toDate = (unix) => (unix ? new Date(unix * 1000) : null);

/**
 * Stripe webhook: POST /api/billing/webhook (legacy alias /api/webhooks/stripe).
 * Verifies the signature on the raw body, ignores replays, and keeps each product's
 * subscription row in sync. The product comes from the metadata set at checkout,
 * or from the price ID when metadata is missing (e.g. a plan change in the portal).
 */
export function billingWebhookRoutes({ store, getStripe, env = process.env }) {
  return async function plugin(app) {
    // Raw body is required for signature verification; scoped to this plugin only.
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (_req, body, done) => done(null, body));

    async function syncSubscription(sub) {
      const item = sub.items?.data?.[0];
      const fromPrice = planForPriceId(item?.price?.id, env);
      const product = sub.metadata?.product || fromPrice?.product;
      if (!product || !PRODUCTS[product]) return { ignored: "unknown product" };
      let orgId = sub.metadata?.org_id;
      if (!orgId && sub.customer) orgId = (await store.findOrgByStripeCustomer(String(sub.customer)))?.id;
      if (!orgId) return { ignored: "unknown workspace" };
      await store.upsertSubscription({
        orgId,
        product,
        planKey: fromPrice?.planKey || sub.metadata?.plan,
        interval: fromPrice?.interval || sub.metadata?.interval,
        status: sub.status,
        currentPeriodEnd: toDate(sub.current_period_end ?? item?.current_period_end),
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        trialEndsAt: toDate(sub.trial_end),
        stripeSubscriptionId: sub.id,
      });
      return { product, orgId };
    }

    const handler = async (req, reply) => {
      const stripe = await getStripe(env);
      const secret = env.STRIPE_WEBHOOK_SECRET;
      if (!stripe || !secret) return reply.code(503).send({ error: "BILLING_NOT_CONFIGURED" });
      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret);
      } catch (err) {
        req.log.warn({ err: err.message }, "stripe signature rejected");
        return reply.code(400).send({ error: "INVALID_SIGNATURE" });
      }
      if (!(await store.markStripeEvent(event.id, event.type))) return reply.send({ received: true, duplicate: true });

      const obj = event.data.object;
      let result = { ignored: event.type };
      switch (event.type) {
        case "checkout.session.completed":
          if (obj.mode === "subscription" && obj.subscription) {
            const sub = typeof obj.subscription === "string" ? await stripe.subscriptions.retrieve(obj.subscription) : obj.subscription;
            sub.metadata = { ...obj.metadata, ...sub.metadata };
            result = await syncSubscription(sub);
          }
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
        case "customer.subscription.paused":
        case "customer.subscription.resumed":
          result = await syncSubscription(obj);
          break;
        case "invoice.payment_failed":
          if (obj.subscription) {
            const existing = await store.findSubscriptionByStripeId(String(obj.subscription));
            if (existing) await store.upsertSubscription({ orgId: existing.org_id, product: existing.product, status: "past_due" });
          }
          break;
        default:
          break;
      }
      req.log.info({ type: event.type, ...result }, "stripe event processed");
      return reply.send({ received: true });
    };

    app.post("/api/billing/webhook", handler);
    app.post("/api/webhooks/stripe", handler);
  };
}
