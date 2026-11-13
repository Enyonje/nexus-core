import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import { PRODUCTS } from "./auth/products.js";
import { productAuthRoutes } from "./auth/routes.js";
import { productBillingRoutes } from "./billing/routes.js";
import { billingWebhookRoutes } from "./billing/webhook.js";
import { getStripe as defaultGetStripe } from "./billing/stripeClient.js";
import { agentRoutes } from "./agents/routes.js";
import { mpesaRoutes } from "./payments/mpesa.js";

const DEFAULT_ORIGINS = [
  "https://nexusthecore.com",
  "https://www.nexusthecore.com",
  "https://supportops.nexusthecore.com",
  "https://nexus-core-chi.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

function pickPlugin(mod) {
  if (typeof mod.default === "function") return mod.default;
  return Object.values(mod).find((v) => typeof v === "function");
}

/**
 * Builds the API. server.js calls this with the Prisma store; tests and the sandbox server
 * call it with the in-memory store and a fake Stripe client.
 *
 * Route map
 *   /api/health
 *   /api/<product>/auth/*      dedicated sign-in per product (nexus-core, supportops, compliance)
 *   /api/auth/*                same as /api/nexus-core/auth/* (kept for existing clients)
 *   /api/<product>/billing/*   plans, subscription, checkout, portal
 *   /api/billing/plans         same as /api/nexus-core/billing/plans
 *   /api/billing/webhook       Stripe webhook (legacy alias /api/webhooks/stripe)
 *   /api/agents/*              agent platform catalogue
 *   /api/payments/mpesa/*      M-Pesa duty payments (Compliance sign-in)
 *   /api/{goals,executions,admin,audit,stream}  core workspace routes (needs the database)
 */
export async function buildApp({ store, getStripe = defaultGetStripe, mailer = null, env = process.env, legacyRoutes = true, logger = true, fetchImpl } = {}) {
  if (!store) throw new Error("buildApp needs a store");
  const app = Fastify({ logger, bodyLimit: 1048576, trustProxy: true });

  const origins = new Set([...DEFAULT_ORIGINS, env.FRONTEND_URL, ...(env.CORS_ALLOWED_ORIGINS || "").split(",").map((o) => o.trim())].filter(Boolean));
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-Org-Id", "X-App-Slug", "Accept", "Cache-Control", "Last-Event-ID"],
  });
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  const health = async () => ({ status: "ok", timestamp: new Date().toISOString(), products: Object.keys(PRODUCTS) });
  app.get("/health", health);
  app.get("/api/health", health);
  app.get("/api/v1/system/health", health);

  for (const slug of Object.keys(PRODUCTS)) {
    const authPlugin = productAuthRoutes({ product: slug, store, mailer, env });
    const billingPlugin = productBillingRoutes({ product: slug, store, getStripe, env });
    await app.register(authPlugin, { prefix: `/api/${slug}/auth` });
    await app.register(billingPlugin, { prefix: `/api/${slug}/billing` });
    for (const legacy of PRODUCTS[slug].legacyMounts) await app.register(authPlugin, { prefix: legacy });
  }
  // Nexus Core is the default product for un-prefixed billing paths used by older pages.
  await app.register(productBillingRoutes({ product: "nexus-core", store, getStripe, env }), { prefix: "/api/billing" });
  await app.register(async (scope) => {
    // Old pricing page called this with { tier }. Same rules as /api/nexus-core/billing/checkout.
    scope.post("/api/payments/create-checkout-session", async (req, reply) => {
      const res = await app.inject({ method: "POST", url: "/api/nexus-core/billing/checkout", headers: { authorization: req.headers.authorization || "", "content-type": "application/json" }, payload: { plan: req.body?.tier || req.body?.plan, interval: req.body?.interval } });
      return reply.code(res.statusCode).send(res.json());
    });
  });
  await app.register(billingWebhookRoutes({ store, getStripe, env }));
  await app.register(agentRoutes({ env }), { prefix: "/api/agents" });
  await app.register(mpesaRoutes({ env, ...(fetchImpl ? { fetchImpl } : {}) }), { prefix: "/api/payments/mpesa" });

  if (legacyRoutes) {
    // These modules talk to Postgres directly, so they are only loaded when a database is configured.
    const mods = {
      goals: await import("./routes/goals.js"),
      admin: await import("./routes/admin.js"),
      executions: await import("./routes/executions.js"),
      audit: await import("./routes/audit.js"),
      stream: await import("./routes/stream.js"),
    };
    for (const [name, mod] of Object.entries(mods)) {
      const plugin = pickPlugin(mod);
      await app.register(plugin, { prefix: `/api/${name}` });
      await app.register(plugin, { prefix: `/api/v1/${name}` });
    }
  }

  app.setNotFoundHandler((req, reply) => reply.code(404).send({ statusCode: 404, error: "Not Found", message: `Route ${req.method}:${req.url.split("?")[0]} not found` }));
  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({ statusCode: status, error: error.code || error.name || "Error", message: status >= 500 && env.NODE_ENV === "production" ? "An error occurred" : error.message });
  });

  return app;
}
