// server.js
import "dotenv/config";
import Fastify from 'fastify';
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";

// Core Routes
import * as webhooksRoutesMod from "./routes/webhooks.js";
import * as authRoutesMod from "./routes/auth.js";
import * as goalsRoutesMod from "./routes/goals.js";
import * as adminRoutesMod from "./routes/admin.js";
import * as executionsRoutesMod from "./routes/executions.js";
import * as auditRoutesMod from "./routes/audit.js";
import * as paymentsRoutesMod from "./routes/payments.js";
import * as streamRoutesMod from "./routes/stream.js";
import * as stripeRoutesMod from "./routes/stripe.js";
import * as marketplaceRoutesMod from "./routes/marketplace.js";
import * as businessRoutesMod from "./routes/business.js";
import * as insightsRoutesMod from "./routes/insights.js";
import salesRoutesMod from "./routes/sales.js";
import salesAgentsRoutes from "./routes/salesAgents.js";
import { startSalesAutopilot } from "./agents/salesAutopilot.js";
import * as integrationsRoutesMod from "./routes/integrations.js";
import * as dashboardRoutesMod from "../supportops/routes/dashboard.js"; // <--- Added Dashboard Routes


// SupportOps Routes
import * as aiLegacyRoutesMod from "../supportops/routes/aiRoutes.js";
import * as aiReviewRoutesMod from "../supportops/routes/aiReviewRoutes.js";
import * as channelsRoutesMod from "../supportops/routes/channelsRoutes.js";
import * as chatRoutesMod from "../supportops/routes/chatRoutes.js";
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketsRoutesMod from "../supportops/routes/ticketsRoutes.js";
import * as inviteRoutesMod from "../supportops/routes/inviteRoutes.js";
import * as readinessRoutesMod from "../supportops/routes/readinessRoutes.js";
import * as billingV1Mod from "../supportops/routes/billingRoutes.js";
import webhookRoutes from "../supportops/routes/webhooks.js";
import { initializeRealtime, closeRealtime } from "../supportops/routes/realtime.js";

function isClassConstructor(func) {
  if (typeof func !== "function") return false;
  return /^\s*class\s+/.test(Function.prototype.toString.call(func));
}

function resolvePlugin(mod, label = "unknown") {
  let picked = null;
  if (typeof mod?.default === "function" && !isClassConstructor(mod.default)) {
    picked = mod.default;
  } else if (typeof mod === "function" && !isClassConstructor(mod)) {
    picked = mod;
  } else {
    for (const key of Object.keys(mod || {})) {
      if (typeof mod[key] === "function" && !isClassConstructor(mod[key])) {
        picked = mod[key];
        break;
      }
    }
  }
  if (!picked) {
    console.warn(`[routes] ${label}: no plugin function exported`);
    return async function emptyPlugin() { };
  }
  return picked;
}

const fastify = Fastify({ logger: true, bodyLimit: 30 * 1024 * 1024 });

// SupportOps legacy mock pricing, login, workspace provisioning, dashboard,
// ticket, channel and invitation handlers were removed. The real, authenticated
// route plugins are registered below; keeping the old handlers here would shadow
// those routes and expose fabricated data.

// Activity streaming is provided by the authenticated Nexus stream plugin.
// The previous hard-coded timer emitted fabricated SupportOps activity and
// has been removed.

// ========================= IMMEDIATE HEALTH CHECK ROUTE =========================
const healthHandler = async (_req, reply) => {
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
fastify.get("/health", healthHandler);
fastify.get("/api/health", healthHandler);
fastify.get("/api/v1/system/health", healthHandler);

async function start() {
  const mountBoth = (label, mod, prefixSegment) => {
    const plugin = resolvePlugin(mod, label);
    fastify.register(plugin, { prefix: `/api/v1/${prefixSegment}` });
    fastify.register(plugin, { prefix: `/api/${prefixSegment}` });
  };

  /* ========================= CORS ========================= */
  const allowedOrigins = [...new Set([
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()),
  ].filter(Boolean))];
  await fastify.register(cors, () => (req, cb) => {
    const origin = req.headers.origin;
    const isWidget = req.url.includes("/chat/widget/");
    const allowed = !origin || isWidget || allowedOrigins.includes(origin);
    cb(null, {
      origin: allowed,
      credentials: !isWidget,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Org-Id",
        "X-App-Slug",
        "Accept",
        "Cache-Control",
        "Last-Event-ID",
      ],
      exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
    });
  });

  /* ========================= PLUGINS ========================= */
  await fastify.register(cookie, { secret: env.COOKIE_SECRET });
  await fastify.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await fastify.register(websocket);

  if (env.DATABASE_URL) {
    try {
      await fastify.register(fastifyPostgres, {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === "production"
          ? { ca: env.PG_CA_CERT, rejectUnauthorized: false }
          : false,
      });
    } catch (err) {
      console.warn("DB connection warning during boot:", err.message);
    }
  }

  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET || "fallback-jwt" });

  /* ========================= CORE ROUTES ========================= */
  // Mount auth plugin under root /auth, /api/auth, and /api/v1/auth
  const authPlugin = resolvePlugin(authRoutesMod, "auth");
  fastify.register(authPlugin, { prefix: "/auth" });
  fastify.register(authPlugin, { prefix: "/api/auth" });
  fastify.register(authPlugin, { prefix: "/api/v1/auth" });
  // ProductAuth calls /api/<product>/auth/*; expose the canonical Nexus
  // auth routes at the slugged path used by the frontend as well.
  fastify.register(authPlugin, { prefix: "/api/nexus-core/auth" });
  fastify.register(webhookRoutes, { prefix: "/api" });
  fastify.register(webhookRoutes, { prefix: "/api/v1" });

  // Other Core Routes
  mountBoth("goals", goalsRoutesMod, "goals");
  mountBoth("admin", adminRoutesMod, "admin");
  mountBoth("executions", executionsRoutesMod, "executions");
  mountBoth("audit", auditRoutesMod, "audit");
  mountBoth("payments", paymentsRoutesMod, "payments");
  mountBoth("stream", streamRoutesMod, "stream");
  mountBoth("stripe", stripeRoutesMod, "stripe");
  mountBoth("marketplace", marketplaceRoutesMod, "marketplace");
  mountBoth("business", businessRoutesMod, "business");
  mountBoth("insights", insightsRoutesMod, "insights");

  mountBoth("admin/sales", salesRoutesMod, "admin/sales");
  fastify.register(salesAgentsRoutes, { prefix: "/api/admin/sales-agents" });
  fastify.register(salesAgentsRoutes, { prefix: "/api/v1/admin/sales-agents" });
  mountBoth("integrations", integrationsRoutesMod, "integrations");
  // Keep the general Nexus dashboard endpoints under /api(/v1)/dashboard.
  mountBoth("dashboard", dashboardRoutesMod, "");
  // SupportOps dashboard metrics use the product-scoped path consumed by its UI.
  mountBoth("supportops/dashboard", dashboardRoutesMod, "supportops");
  // Sales Assistant remains an independent application and is not mounted here.

  fastify.register(resolvePlugin(webhooksRoutesMod, "webhooks"));

  /* ========================= SUPPORTOPS ROUTES ========================= */
  // Canonical, database-backed SupportOps API. Every staff-facing route uses
  // Nexus identity plus persisted SupportOps workspace/app entitlements.
  mountBoth("supportops/tickets", ticketsRoutesMod, "supportops/tickets");
  mountBoth("supportops/channels", channelsRoutesMod, "supportops/tickets/channels");
  mountBoth("supportops/chat", chatRoutesMod, "supportops/chat");
  mountBoth("supportops/invites", inviteRoutesMod, "supportops/invites");
  mountBoth("supportops/readiness", readinessRoutesMod, "supportops/readiness");
  mountBoth("supportops/ai-agent", aiLegacyRoutesMod, "supportops/ai-agent");
  mountBoth("supportops/ai-review", aiReviewRoutesMod, "supportops/ai-review");
  mountBoth("supportops/incidents", incidentsRoutesMod, "supportops/incidents");
  mountBoth("supportops/supportops", supportopsRoutesMod, "supportops");
  mountBoth("supportops/billing", billingV1Mod, "supportops/billing");

  // Stripe requires the unparsed request body for signature verification.
  // This plugin is deliberately separate from the JSON-parsed billing routes.
  fastify.register(billingV1Mod.stripeWebhookPlugin, {
    prefix: "/api/v1/supportops/webhooks",
  });


  /* ========================= ERROR HANDLERS ========================= */
  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${req.method}:${req.url} not found`,
    });
  });

  fastify.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({
      statusCode: status,
      error: error.name || "Internal Server Error",
      message: status >= 500 && env.NODE_ENV === "production"
        ? "An error occurred"
        : error.message || "An error occurred",
    });
  });

  // Shared Redis Pub/Sub is required for realtime fan-out across multiple API instances.
  await initializeRealtime();
  fastify.addHook("onClose", async () => {
    await closeRealtime();
  });

  startSalesAutopilot(fastify);

  const port = process.env.PORT || env.PORT || 10000;
  await fastify.listen({ port: Number(port), host: "0.0.0.0" });
  console.log(`🚀 API running on port ${port} in ${env.NODE_ENV || "development"} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});