import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
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

// SupportOps Route Plugins (ONLY files that export a Fastify plugin belong here)
import * as aiRoutesMod from "../supportops/routes/ai.js";
import * as aiLegacyRoutesMod from "../supportops/routes/aiRoutes.js";
import * as aiReviewRoutesMod from "../supportops/routes/aiReviewRoutes.js";
import * as channelsRoutesMod from "../supportops/routes/channelsRoutes.js";
import * as chatRoutesMod from "../supportops/routes/chatRoutes.js";
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as orgAnalyticsRoutesMod from "../supportops/routes/orgAnalyticsRoutes.js";
import * as stripeWebhookRoutesMod from "../supportops/routes/stripeWebhook.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketsRoutesMod from "../supportops/routes/ticketsRoutes.js"; // the NEW ticket API
import * as oldTicketsRoutesMod from "../supportops/routes/tickets.js"; // your previous tickets plugin
import * as inviteRoutesMod from "../supportops/routes/inviteRoutes.js"; // team invites and members
import * as readinessRoutesMod from "../supportops/routes/readinessRoutes.js"; // admin go-live checklist
import * as billingV1Mod from "../supportops/routes/billingRoutes.js"; // plans, trial, checkout, Stripe webhook

dotenv.config();

/**
 * Checks if a function is an ES6/class constructor
 */
function isClassConstructor(func) {
  if (typeof func !== "function") return false;
  return /^\s*class\s+/.test(Function.prototype.toString.call(func));
}

/**
 * Resolves a Fastify plugin from an imported module safely.
 * Normalizes ESM module imports and handles default/named exports without throwing boot warnings.
 */
function resolvePlugin(mod, label = "unknown") {
  let picked = null;
  let via = null;

  if (typeof mod?.default === "function" && !isClassConstructor(mod.default)) {
    picked = mod.default;
    via = "default";
  } else if (typeof mod === "function" && !isClassConstructor(mod)) {
    picked = mod;
    via = "module";
  } else {
    for (const key of Object.keys(mod || {})) {
      if (typeof mod[key] === "function" && !isClassConstructor(mod[key])) {
        picked = mod[key];
        via = key;
        break;
      }
    }
  }

  if (!picked) {
    console.warn(`[routes] ${label}: exports no plugin function, so NOTHING was registered (expect 404s)`);
    return async function emptyPlugin() { };
  }

  if (typeof picked.handle === "function" && Array.isArray(picked.stack)) {
    console.error(`[routes] ${label}: this is an EXPRESS router, not a Fastify plugin. Convert it to: export default async function (app) { app.get(...) }`);
    return async function emptyPlugin() { };
  }

  return picked;
}

// Create Fastify instance
const app = Fastify({
  logger: true,
  bodyLimit: 1048576,
});

async function start() {
  const mount = (label, mod, prefix) => app.register(resolvePlugin(mod, label), prefix ? { prefix } : undefined);

  /* ========================= CORS PLUGIN ========================= */
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  await app.register(cors, () => (req, cb) => {
    const origin = req.headers.origin;
    const isWidget = req.url.startsWith("/api/v1/supportops/chat/widget/");

    // Allow exact origins, Vercel/Render subdomains, or server-to-server calls without an origin header
    const isAllowedOrigin =
      !origin ||
      isWidget ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /\.onrender\.com$/.test(origin);

    cb(null, {
      origin: isAllowedOrigin,
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

  /* ========================= OTHER PLUGINS ========================= */
  await app.register(cookie, {
    secret: env.COOKIE_SECRET,
    parseOptions: {},
  });

  await app.register(websocket);

  await app.register(fastifyPostgres, {
    connectionString: env.DATABASE_URL,
    ssl:
      env.NODE_ENV === "production"
        ? { ca: env.PG_CA_CERT, rejectUnauthorized: false }
        : false,
  });

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  /* ========================= HEALTH CHECKS ========================= */
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/ping", async () => ({ status: "pong", timestamp: new Date().toISOString() }));
  app.get("/api/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/api/v1/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/api/v1/ping", async () => ({ status: "pong", timestamp: new Date().toISOString() }));

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

  /* ========================= DASHBOARD & REALTIME FALLBACKS ========================= */
  app.get("/api/v1/dashboard/metrics", async (request, reply) => {
    const { timeframe = "30d" } = request.query;
    return reply.send({
      timeframe,
      totalTickets: 1280,
      resolvedTickets: 1142,
      avgResponseTimeMinutes: 14.2,
      csatScore: 4.8,
      activeAgents: 12,
    });
  });

  app.get("/api/v1/agents/activity/stream", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      ...reply.getHeaders(),
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write("retry: 3000\n\n");
    reply.raw.write(`data: ${JSON.stringify({ status: "connected", timestamp: new Date() })}\n\n`);

    const keepAliveInterval = setInterval(() => reply.raw.write(`: keepalive\n\n`), 15000);
    request.raw.on("close", () => clearInterval(keepAliveInterval));
  });

  /* ========================= CORE ROUTES ========================= */
  // Mounted auth routes under both prefixes to resolve /api/v1/auth/me 404
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
  await mount("supportops/tickets", ticketsRoutesMod, "/api/v1/supportops/tickets");
  await mount("supportops/channels", channelsRoutesMod, "/api/v1/supportops/tickets/channels");
  await mount("supportops/chat", chatRoutesMod, "/api/v1/supportops/chat");
  await mount("supportops/invites", inviteRoutesMod, "/api/v1/supportops/invites");
  await mount("supportops/readiness", readinessRoutesMod, "/api/v1/supportops/readiness");
  await mount("supportops/tickets-legacy", oldTicketsRoutesMod, "/api/v1/supportops/tickets-legacy");
  await mount("supportops/ai", aiRoutesMod, "/api/v1/supportops/ai");
  await mount("supportops/ai-v2", aiLegacyRoutesMod, "/api/v1/supportops/ai-v2");
  await mount("supportops/ai-review", aiReviewRoutesMod, "/api/v1/supportops/ai-review");
  await mount("supportops/incidents", incidentsRoutesMod, "/api/v1/supportops/incidents");
  await mount("supportops/analytics", orgAnalyticsRoutesMod, "/api/v1/supportops/analytics");
  await mount("supportops/webhooks-stripe", stripeWebhookRoutesMod, "/api/v1/supportops/webhooks/stripe");

  // Core base supportops aggregator plugin
  await mount("supportops/supportops", supportopsRoutesMod, "/api/v1/supportops");

  /* ========================= NOT FOUND & ERROR HANDLER ========================= */
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
      message: status >= 500 && env.NODE_ENV === "production" ? "An error occurred" : error.message || "An error occurred",
    });
  });

  // Output registered route table on boot
  await app.ready();
  app.log.info(`\nRegistered routes:\n${app.printRoutes()}`);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});