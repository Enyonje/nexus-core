import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/auth/stores/memoryStore.js";
import { createFakeStripe } from "./helpers/fakeStripe.js";
import { publicPlans } from "../src/billing/catalog.js";

const env = {
  NODE_ENV: "test", JWT_SECRET: "y".repeat(40), COOKIE_SECRET: "c".repeat(20), FRONTEND_URL: "https://nexusthecore.com",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  STRIPE_PRICE_NEXUS_CORE_PRO_MONTHLY: "price_nc_pro_m",
  STRIPE_PRICE_NEXUS_CORE_PRO_ANNUAL: "price_nc_pro_a",
  STRIPE_PRICE_COMPLIANCE_PRO_MONTHLY: "price_cb_pro_m",
};

async function setup({ withStripe = true } = {}) {
  const store = createMemoryStore();
  const stripe = createFakeStripe({ store, env });
  const app = await buildApp({ store, env, legacyRoutes: false, logger: false, getStripe: async () => (withStripe ? stripe : null) });
  return { app, store, stripe };
}

async function signUp(app, product, email = "owner@example.com") {
  const res = await app.inject({ method: "POST", url: `/api/${product}/auth/register`, payload: { email, password: "correct-horse-battery", organization: "Acme" } });
  return res.json();
}

test("Nexus Core plan prices: Starter $29/$23, Pro $79/$63, Enterprise $249/$199", () => {
  const plans = Object.fromEntries(publicPlans("nexus-core", env).map((p) => [p.key, p.prices]));
  assert.deepEqual([plans.starter.monthly.amount, plans.starter.annual.amount], [29, 23]);
  assert.deepEqual([plans.pro.monthly.amount, plans.pro.annual.amount], [79, 63]);
  assert.deepEqual([plans.enterprise.monthly.amount, plans.enterprise.annual.amount], [249, 199]);
});

test("pricing is public for every product", async () => {
  const { app } = await setup();
  for (const product of ["nexus-core", "supportops", "compliance"]) {
    const res = await app.inject({ method: "GET", url: `/api/${product}/billing/plans` });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().product, product);
    assert.ok(res.json().plans.length >= 3);
  }
  const legacy = await app.inject({ method: "GET", url: "/api/billing/plans" });
  assert.equal(legacy.json().product, "nexus-core");
});

test("plans without a configured Stripe price show 'contact' instead of a broken checkout", async () => {
  const plans = publicPlans("nexus-core", env);
  assert.equal(plans.find((p) => p.key === "pro").prices.monthly.checkout, "stripe");
  assert.equal(plans.find((p) => p.key === "enterprise").prices.monthly.checkout, "contact");
});

test("checkout requires sign-in to that product", async () => {
  const { app } = await setup();
  const anon = await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", payload: { plan: "pro" } });
  assert.equal(anon.statusCode, 401);
  const { token } = await signUp(app, "compliance");
  const crossProduct = await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: { authorization: `Bearer ${token}` }, payload: { plan: "pro" } });
  assert.equal(crossProduct.statusCode, 401);
});

test("checkout -> payment -> subscription is active only for the product that was bought", async () => {
  const { app, stripe } = await setup();
  const nc = await signUp(app, "nexus-core");
  const auth = { authorization: `Bearer ${nc.token}` };
  const res = await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: auth, payload: { plan: "pro", interval: "annual" } });
  assert.equal(res.statusCode, 200);
  const sessionId = res.json().url.split("/checkout/")[1].split("/")[0];
  await stripe._complete(sessionId);

  const sub = await app.inject({ method: "GET", url: "/api/nexus-core/billing/subscription", headers: auth });
  assert.equal(sub.json().plan, "pro");
  assert.equal(sub.json().active, true);
  assert.equal(sub.json().interval, "annual");

  const cb = await app.inject({ method: "POST", url: "/api/compliance/auth/register", payload: { email: "owner@example.com", password: "correct-horse-battery" } });
  const cbSub = await app.inject({ method: "GET", url: "/api/compliance/billing/subscription", headers: { authorization: `Bearer ${cb.json().token}` } });
  assert.equal(cbSub.json().plan, "free", "buying Nexus Core Pro does not unlock Compliance");
});

test("free plan and unknown plans cannot be checked out", async () => {
  const { app } = await setup();
  const { token } = await signUp(app, "nexus-core");
  const auth = { authorization: `Bearer ${token}` };
  assert.equal((await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: auth, payload: { plan: "free" } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: auth, payload: { plan: "gold" } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: auth, payload: { plan: "enterprise" } })).statusCode, 409);
});

test("billing answers 503 when Stripe is not configured", async () => {
  const { app } = await setup({ withStripe: false });
  const { token } = await signUp(app, "nexus-core");
  const res = await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: { authorization: `Bearer ${token}` }, payload: { plan: "pro" } });
  assert.equal(res.statusCode, 503);
});

test("webhook rejects bad signatures, applies updates, and ignores replays", async () => {
  const { app, store, stripe } = await setup();
  const { user } = await signUp(app, "compliance");
  const event = {
    id: "evt_1", type: "customer.subscription.updated",
    data: { object: { id: "sub_1", status: "active", customer: "cus_x", metadata: { product: "compliance", org_id: user.org_id }, current_period_end: 1900000000, cancel_at_period_end: true, items: { data: [{ price: { id: "price_cb_pro_m" } }] } } },
  };
  const payload = JSON.stringify(event);
  const bad = await app.inject({ method: "POST", url: "/api/billing/webhook", headers: { "content-type": "application/json", "stripe-signature": "nope" }, payload });
  assert.equal(bad.statusCode, 400);
  const sig = stripe.webhooks.sign(payload, env.STRIPE_WEBHOOK_SECRET);
  const ok = await app.inject({ method: "POST", url: "/api/billing/webhook", headers: { "content-type": "application/json", "stripe-signature": sig }, payload });
  assert.equal(ok.statusCode, 200);
  const sub = await store.getSubscription(user.org_id, "compliance");
  assert.equal(sub.plan_key, "pro");
  assert.equal(sub.cancel_at_period_end, true);
  const replay = await app.inject({ method: "POST", url: "/api/webhooks/stripe", headers: { "content-type": "application/json", "stripe-signature": sig }, payload });
  assert.equal(replay.json().duplicate, true);
});

test("old pricing button endpoint still starts a Nexus Core checkout", async () => {
  const { app } = await setup();
  const { token } = await signUp(app, "nexus-core");
  const res = await app.inject({ method: "POST", url: "/api/payments/create-checkout-session", headers: { authorization: `Bearer ${token}` }, payload: { tier: "pro" } });
  assert.equal(res.statusCode, 200);
  assert.ok(res.json().url);
});
