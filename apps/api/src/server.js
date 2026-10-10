import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import dotenv from "dotenv";

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

// SupportOps Routes
import * as aiRoutesMod from "../supportops/routes/ai.js";
import * as aiLegacyRoutesMod from "../supportops/routes/aiRoutes.js";
import * as aiReviewRoutesMod from "../supportops/routes/aiReviewRoutes.js";
import * as channelsRoutesMod from "../supportops/routes/channelsRoutes.js";
import * as chatRoutesMod from "../supportops/routes/chatRoutes.js";
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as orgAnalyticsRoutesMod from "../supportops/routes/orgAnalyticsRoutes.js";
import * as stripeWebhookRoutesMod from "../supportops/routes/stripeWebhook.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketsRoutesMod from "../supportops/routes/ticketsRoutes.js";
import * as oldTicketsRoutesMod from "../supportops/routes/tickets.js";
import * as inviteRoutesMod from "../supportops/routes/inviteRoutes.js";
import * as readinessRoutesMod from "../supportops/routes/readinessRoutes.js";
import * as billingV1Mod from "../supportops/routes/billingRoutes.js";

dotenv.config();

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

const app = Fastify({ logger: true, bodyLimit: 1048576 });

async function start() {
  const mountBoth = (label, mod, prefixSegment) => {
    const plugin = resolvePlugin(mod, label);
    // Register under both /api/v1/... and /api/... so frontend queries never 404
    app.register(plugin, { prefix: `/api/v1/${prefixSegment}` });
    app.register(plugin, { prefix: `/api/${prefixSegment}` });
  };

  /* ========================= CORS ========================= */
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
  await app.register(cors, () => (req, cb) => {
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
        "Accept",
        "Cache-Control",
        "Last-Event-ID",
      ],
      exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
    });
  });

  /* ========================= PLUGINS ========================= */
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(websocket);
  await app.register(fastifyPostgres, {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === "production"
      ? { ca: env.PG_CA_CERT, rejectUnauthorized: false }
      : false,
  });
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  /* ========================= HEALTH ========================= */
  const healthHandler = async (_req, reply) => {
    let database = "connected";
    try {
      await app.pg.query("SELECT 1");
    } catch {
      database = "unreachable";
    }
    const ok = database === "connected";
    return reply.code(ok ? 200 : 503).send({
      status: ok ? "ok" : "degraded",
      services: { database },
      timestamp: new Date().toISOString(),
    });
  };
  app.get("/api/v1/system/health", healthHandler);
  app.get("/api/system/health", healthHandler);

  /* ========================= CORE ROUTES ========================= */
  mountBoth("auth", authRoutesMod, "auth");
  mountBoth("goals", goalsRoutesMod, "goals");
  mountBoth("admin", adminRoutesMod, "admin");
  mountBoth("executions", executionsRoutesMod, "executions");
  mountBoth("audit", auditRoutesMod, "audit");
  mountBoth("payments", paymentsRoutesMod, "payments");
  mountBoth("stream", streamRoutesMod, "stream");
  mountBoth("stripe", stripeRoutesMod, "stripe");

  app.register(resolvePlugin(webhooksRoutesMod, "webhooks"));

  /* ========================= SUPPORTOPS ROUTES ========================= */
  mountBoth("supportops/tickets", ticketsRoutesMod, "supportops/tickets");
  mountBoth("supportops/channels", channelsRoutesMod, "supportops/tickets/channels");
  mountBoth("supportops/chat", chatRoutesMod, "supportops/chat");
  mountBoth("supportops/invites", inviteRoutesMod, "supportops/invites");
  mountBoth("supportops/readiness", readinessRoutesMod, "supportops/readiness");
  mountBoth("supportops/tickets-legacy", oldTicketsRoutesMod, "supportops/tickets-legacy");
  mountBoth("supportops/ai", aiRoutesMod, "supportops/ai");
  mountBoth("supportops/ai-v2", aiLegacyRoutesMod, "supportops/ai-v2");
  mountBoth("supportops/ai-review", aiReviewRoutesMod, "supportops/ai-review");
  mountBoth("supportops/incidents", incidentsRoutesMod, "supportops/incidents");
  mountBoth("supportops/analytics", orgAnalyticsRoutesMod, "supportops/analytics");
  mountBoth("supportops/webhooks-stripe", stripeWebhookRoutesMod, "supportops/webhooks/stripe");
  mountBoth("supportops/supportops", supportopsRoutesMod, "supportops");

  // SupportOps billing plugin (mounted at /api/billing and /api/v1/billing)
  mountBoth("billing-v1", billingV1Mod, "billing");

  /* ========================= ERROR HANDLERS ========================= */
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${req.method}:${req.url} not found`,
    });
  });

  app.setErrorHandler((error, req, reply) => {
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

  await app.ready();
  app.log.info(`\nRegistered routes:\n${app.printRoutes()}`);

  await app.listen({ port: env.PORT || 10000, host: "0.0.0.0" });
  console.log(`🚀 API running on port ${env.PORT || 10000} in ${env.NODE_ENV} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});