// Runs the real API routes with an in-memory store and a fake Stripe, so the website can be
// clicked through end-to-end without Postgres or Stripe keys.
//   npm run dev:sandbox      (then run the website with `npm run dev` in apps/ui)
// Data is lost when the process stops. Never deploy this.
import crypto from "crypto";
import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/auth/stores/memoryStore.js";
import { createFakeStripe } from "../test/helpers/fakeStripe.js";

const env = {
  ...process.env,
  NODE_ENV: "development",
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex"),
  COOKIE_SECRET: process.env.COOKIE_SECRET || crypto.randomBytes(16).toString("hex"),
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  STRIPE_WEBHOOK_SECRET: "whsec_sandbox",
  STRIPE_PRICE_NEXUS_CORE_STARTER_MONTHLY: "price_nc_starter_m",
  STRIPE_PRICE_NEXUS_CORE_PRO_MONTHLY: "price_nc_pro_m",
  STRIPE_PRICE_NEXUS_CORE_PRO_ANNUAL: "price_nc_pro_a",
  STRIPE_PRICE_COMPLIANCE_PRO_MONTHLY: "price_cb_pro_m",
  STRIPE_PRICE_SUPPORTOPS_GROWTH_MONTHLY: "price_so_growth_m",
};

const store = createMemoryStore();
const stripe = createFakeStripe({ store, env });
const app = await buildApp({ store, getStripe: async () => stripe, env, legacyRoutes: false, logger: { level: "warn" } });

// Sandbox-only: finishing the fake checkout marks the plan active, like Stripe's webhook would.
app.get("/sandbox/checkout/:id/complete", async (req, reply) => {
  const done = await stripe._complete(req.params.id);
  return reply.redirect(done?.success_url?.replace("{CHECKOUT_SESSION_ID}", req.params.id) || env.FRONTEND_URL);
});

const port = Number(process.env.PORT || 3001);
await app.listen({ port, host: "127.0.0.1" });
console.log(`Sandbox API on http://127.0.0.1:${port} (in-memory, fake Stripe)`);
