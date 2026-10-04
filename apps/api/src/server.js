import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";

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
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as orgAnalyticsRoutesMod from "../supportops/routes/orgAnalyticsRoutes.js";
import * as outboundRoutesMod from "../supportops/routes/outbound.js";
import * as replyServiceRoutesMod from "../supportops/routes/replyService.js";
import * as stripeWebhookRoutesMod from "../supportops/routes/stripeWebhook.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketRulesRoutesMod from "../supportops/routes/ticketRules.js";
import * as ticketServiceRoutesMod from "../supportops/routes/ticketService.js";
import * as ticketsRoutesMod from "../supportops/routes/tickets.js";
import * as ticketsLegacyRoutesMod from "../supportops/routes/ticketsRoutes.js";

/**
 * Checks if a function is an ES6/class constructor
 */
function isClassConstructor(func) {
  if (typeof func !== "function") return false;
  return /^\s*class\s+/.test(Function.prototype.toString.call(func));
}

/**
 * Safely resolves Fastify plugin functions from imported modules while ignoring class constructors
 */
function resolvePlugin(mod) {
  // Check default export first
  if (typeof mod?.default === "function" && !isClassConstructor(mod.default)) {
    return mod.default;
  }

  // Check direct module function
  if (typeof mod === "function" && !isClassConstructor(mod)) {
    return mod;
  }

  // Find first non-class exported function
  const keys = Object.keys(mod || {});
  for (const key of keys) {
    if (typeof mod[key] === "function" && !isClassConstructor(mod[key])) {
      return mod[key];
    }
  }

  // Fallback no-op plugin if the module only exports helper classes/utilities
  return async function dummyPlugin() { };
}

// Create Fastify instance
const app = Fastify({
  logger: true,
  bodyLimit: 1048576,
});

async function start() {
  /* ========================= PLUGINS ========================= */
  await app.register(cors, {
    origin: [
      "https://nexusthecore.com",
      "https://nexus-core-chi.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

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

  /* ========================= CORE ROUTES ========================= */
  await app.register(resolvePlugin(authRoutesMod), { prefix: "/api/auth" });
  await app.register(resolvePlugin(goalsRoutesMod), { prefix: "/api/goals" });
  await app.register(resolvePlugin(adminRoutesMod), { prefix: "/api/admin" });
  await app.register(resolvePlugin(executionsRoutesMod), { prefix: "/api/executions" });
  await app.register(resolvePlugin(auditRoutesMod), { prefix: "/api/audit" });
  await app.register(resolvePlugin(billingRoutesMod), { prefix: "/api/billing" });
  await app.register(resolvePlugin(paymentsRoutesMod), { prefix: "/api/payments" });
  await app.register(resolvePlugin(streamRoutesMod), { prefix: "/api/stream" });
  await app.register(resolvePlugin(stripeRoutesMod), { prefix: "/api/stripe" });
  await app.register(resolvePlugin(webhooksRoutesMod));

  /* ========================= SUPPORTOPS ROUTES ========================= */
  await app.register(resolvePlugin(supportopsRoutesMod), { prefix: "/api/v1/supportops" });
  await app.register(resolvePlugin(aiRoutesMod), { prefix: "/api/v1/supportops/ai" });
  await app.register(resolvePlugin(aiLegacyRoutesMod), { prefix: "/api/v1/supportops/ai-v2" });
  await app.register(resolvePlugin(aiReviewRoutesMod), { prefix: "/api/v1/supportops/ai-review" });
  await app.register(resolvePlugin(channelsRoutesMod), { prefix: "/api/v1/supportops/channels" });
  await app.register(resolvePlugin(chatRoutesMod), { prefix: "/api/v1/supportops/chat" });
  await app.register(resolvePlugin(incidentsRoutesMod), { prefix: "/api/v1/supportops/incidents" });
  await app.register(resolvePlugin(orgAnalyticsRoutesMod), { prefix: "/api/v1/supportops/analytics" });
  await app.register(resolvePlugin(outboundRoutesMod), { prefix: "/api/v1/supportops/outbound" });
  await app.register(resolvePlugin(replyServiceRoutesMod), { prefix: "/api/v1/supportops/replies" });
  await app.register(resolvePlugin(stripeWebhookRoutesMod), { prefix: "/api/v1/supportops/webhooks/stripe" });
  await app.register(resolvePlugin(ticketRulesRoutesMod), { prefix: "/api/v1/supportops/ticket-rules" });
  await app.register(resolvePlugin(ticketServiceRoutesMod), { prefix: "/api/v1/supportops/ticket-service" });
  await app.register(resolvePlugin(ticketsRoutesMod), { prefix: "/api/v1/supportops/tickets" });
  await app.register(resolvePlugin(ticketsLegacyRoutesMod), { prefix: "/api/v1/supportops/tickets-v2" });

  /* ========================= ERROR HANDLER & LISTEN ========================= */
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code(error.statusCode || 500).send({
      error: error.message || "Internal Server Error",
    });
  });

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`🚀 API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
}

start();