import crypto from "crypto";
import { planForPriceId } from "../../src/billing/catalog.js";

/**
 * Minimal Stripe stand-in for tests and the sandbox server. Implements only what the billing
 * routes call. `_complete(sessionId)` simulates the customer paying and Stripe sending the webhook
 * effects (writes the subscription through the same store method the webhook uses).
 */
export function createFakeStripe({ store, env = process.env } = {}) {
  const sessions = new Map();
  const subs = new Map();
  const id = (p) => `${p}_${crypto.randomBytes(6).toString("hex")}`;
  const port = env.PORT || 3001;

  return {
    calls: [],
    customers: {
      async create(data) { return { id: id("cus"), ...data }; },
    },
    checkout: {
      sessions: {
        async create(params, opts) {
          const session = { id: id("cs"), url: null, ...params, idempotencyKey: opts?.idempotencyKey };
          session.url = `http://127.0.0.1:${port}/sandbox/checkout/${session.id}/complete`;
          sessions.set(session.id, session);
          return session;
        },
      },
    },
    billingPortal: {
      sessions: { async create(params) { return { id: id("bps"), url: `${params.return_url}?portal=sandbox` }; } },
    },
    subscriptions: {
      async retrieve(subId) { return subs.get(subId); },
    },
    webhooks: {
      constructEvent(rawBody, signature, secret) {
        const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        if (signature !== expected) throw new Error("No signatures found matching the expected signature");
        return JSON.parse(Buffer.from(rawBody).toString("utf8"));
      },
      sign(payload, secret) {
        return crypto.createHmac("sha256", secret).update(payload).digest("hex");
      },
    },
    async _complete(sessionId) {
      const s = sessions.get(sessionId);
      if (!s) return null;
      const priceId = s.line_items[0].price;
      const sub = {
        id: id("sub"), status: "active", customer: s.customer, metadata: s.metadata,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400, cancel_at_period_end: false,
        items: { data: [{ price: { id: priceId } }] },
      };
      subs.set(sub.id, sub);
      const plan = planForPriceId(priceId, env);
      await store?.upsertSubscription({
        orgId: s.metadata.org_id, product: s.metadata.product, planKey: plan?.planKey || s.metadata.plan,
        interval: plan?.interval, status: "active", currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: false, stripeSubscriptionId: sub.id,
      });
      return s;
    },
    _subs: subs,
  };
}
