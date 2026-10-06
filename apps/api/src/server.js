import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import fp from "fastify-plugin";
import dotenv from "dotenv";

// Import validated env first
import { env } from "./config/env.js";

// Core Routes
import * as webhooksRoutesMod from "./routes/webhooks.js";
import * as authRoutesMod from "./routes/auth.js";
import * as goalsRoutesMod from "./routes/goals.js";
import * as adminRoutesMod from "./routes/admin.js";
import * as executionsRoutesMod from "./routes/executions.js";
import * as auditRoutesMod from "./routes/audit.js";
import * as billingRoutesMod from "./routes/billing.js";
import * as paymentsRoutesMod from "./routes/payments.js";
import * as streamRoutesMod from "./routes/stream.js";
import * as stripeRoutesMod from "./routes/stripe.js";

// SupportOps Route Plugins
import * as aiRoutesMod from "../supportops/routes/ai.js";
import * as aiLegacyRoutesMod from "../supportops/routes/aiRoutes.js";
import * as aiReviewRoutesMod from "../supportops/routes/aiReviewRoutes.js";
import * as channelsRoutesMod from "../supportops/routes/channelsRoutes.js";
import * as chatRoutesMod from "../supportops/routes/chatRoutes.js";
import * as supportopsAuthRoutesMod from "../supportops/routes/auth.js";
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as orgAnalyticsRoutesMod from "../supportops/routes/orgAnalyticsRoutes.js";
import * as stripeWebhookRoutesMod from "../supportops/routes/stripeWebhook.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketsRoutesMod from "../supportops/routes/ticketsRoutes.js";
import * as oldTicketsRoutesMod from "../supportops/routes/tickets.js";
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
  } else if (mod && typeof mod === "object") {
    for (const key of Object.keys(mod)) {
      if (typeof mod[key] === "function" && !isClassConstructor(mod[key])) {
        picked = mod[key];
        break;
      }
    }
  }

  if (!picked) {
    console.warn(`[routes] ${label}: exports no plugin function, registering empty plugin`);
    return fp(async function emptyPlugin() {});
  }

  // Wrap with fastify-plugin to break encapsulation where necessary
  return typeof picked[Symbol.for("skip-override")] !== "undefined"
    ? picked
    : fp(picked, { name: label });
}

const app = Fastify({
  logger: true,
  bodyLimit: 1048576,
});

async function start() {
  const mount = (label, mod, prefix) =>
    app.register(resolvePlugin(mod, label), prefix ? { prefix } : undefined);

  /* ========================= CORS ========================= */
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
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

  /* ========================= PLUGINS ========================= */
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(websocket);
  await app.register(fastifyPostgres, {
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === "production" ? { ca: env.PG_CA_CERT, rejectUnauthorized: false } : false,
  });
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  /* ========================= HEALTH CHECKS ========================= */
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/api/v1/system/health", async (_request, reply) => {
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
  });

  /* ========================= DASHBOARD & REALTIME ========================= */
  app.get("/api/v1/dashboard/metrics", async (request, reply) => {
    return reply.send({
      timeframe: request.query.timeframe || "30d",
      totalTickets: 1280,
      resolvedTickets: 1142,
      avgResponseTimeMinutes: 14.2,
      csatScore: 4.8,
      activeAgents: 12,
    });
  });

  app.get("/api/v1/agents/activity/stream", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": request.headers.origin || "*",
    });
    reply.raw.write("retry: 3000\n\n");
    reply.raw.write(`data: ${JSON.stringify({ status: "connected", timestamp: new Date().toISOString() })}\n\n`);

    const keepAliveInterval = setInterval(() => {
      reply.raw.write(`: keepalive\n\n`);
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepAliveInterval);
    });
  });

  /* ========================= CORE ROUTES ========================= */
  await mount("auth", authRoutesMod, "/api/auth");
  await mount("auth-v1", authRoutesMod, "/api/v1/auth");
  await mount("goals", goalsRoutesMod, "/api/goals");
  await mount("admin", adminRoutesMod, "/api/admin");
  await mount("executions", executionsRoutesMod, "/api/executions");
  await mount("audit", auditRoutesMod, "/api/audit");
  await mount("billing", billingRoutesMod, "/api/billing");
  await mount("payments", paymentsRoutesMod, "/api/payments");
  await mount("stream", streamRoutesMod, "/api/stream");
  await mount("stripe", stripeRoutesMod, "/api/stripe");
  await mount("webhooks", webhooksRoutesMod);

  /* ========================= CENTRAL BILLING ========================= */
  await mount("billing-v1", billingV1Mod, "/api/v1/billing");
  await mount("billing-v1-webhook", { default: billingV1Mod.stripeWebhookPlugin }, "/api/v1/billing/webhooks");

  /* ========================= SUPPORTOPS ROUTES ========================= */
  await mount("supportops/auth", supportopsAuthRoutesMod, "/api/v1/supportops/auth");
  await mount("supportops/tickets", ticketsRoutesMod, "/api/v1/supportops/tickets");
  await mount("supportops/channels", channelsRoutesMod, "/api/v1/supportops/tickets/channels");
  await mount("supportops/chat", chatRoutesMod, "/api/v1/supportops/chat");
  await mount("supportops/tickets-legacy", oldTicketsRoutesMod, "/api/v1/supportops/tickets-legacy");
  await mount("supportops/ai", aiRoutesMod, "/api/v1/supportops/ai");
  await mount("supportops/ai-v2", aiLegacyRoutesMod, "/api/v1/supportops/ai-v2");
  await mount("supportops/ai-review", aiReviewRoutesMod, "/api/v1/supportops/ai-review");
  await mount("supportops/incidents", incidentsRoutesMod, "/api/v1/supportops/incidents");
  await mount("supportops/analytics", orgAnalyticsRoutesMod, "/api/v1/supportops/analytics");
  await mount("supportops/webhooks-stripe", stripeWebhookRoutesMod, "/api/v1/supportops/webhooks/stripe");

  // Core base supportops plugin mounted LAST to avoid catching sub-paths
  await mount("supportops/supportops", supportopsRoutesMod, "/api/v1/supportops");

  /* ========================= ERROR HANDLING ========================= */
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({
      statusCode: status,
      error: error.name || "Internal Server Error",
      message:
        status >= 500 && env.NODE_ENV === "production"
          ? "An error occurred"
          : error.message || "An error occurred",
    });
  });

  await app.ready();
  app.log.info(`\nRegistered routes:\n${app.printRoutes()}`);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});