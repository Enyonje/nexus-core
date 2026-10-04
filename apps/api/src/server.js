import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";

// Import validated env first
import { env } from "./config/env.js";

// Core Routes
import { webhooksRoutes } from "./routes/webhooks.js";
import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";
import { adminRoutes } from "./routes/admin.js";
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { billingRoutes } from "./routes/billing.js";
import { paymentsRoutes } from "./routes/payments.js";
import { streamRoutes } from "./routes/stream.js";
import { stripeRoutes } from "./routes/stripe.js";

// SupportOps Route Plugins
import aiRoutes from "../supportops/routes/ai.js";
import aiLegacyRoutes from "../supportops/routes/aiRoutes.js";
import aiReviewRoutes from "../supportops/routes/aiReviewRoutes.js";
import channelsRoutes from "../supportops/routes/channelsRoutes.js";
import chatRoutes from "../supportops/routes/chatRoutes.js";
import incidentsRoutes from "../supportops/routes/incidents.js";
import orgAnalyticsRoutes from "../supportops/routes/orgAnalyticsRoutes.js";
import outboundRoutes from "../supportops/routes/outbound.js";
import { visitors, staff, openStream, push } from "../supportops/routes/realtime.js"; // helpers only
import replyServiceRoutes from "../supportops/routes/replyService.js";
import stripeWebhookRoutes from "../supportops/routes/stripeWebhook.js";
import supportopsRoutes from "../supportops/routes/supportops.js";
import ticketRulesRoutes from "../supportops/routes/ticketRules.js";
import ticketServiceRoutes from "../supportops/routes/ticketService.js";
import ticketsRoutes from "../supportops/routes/tickets.js";
import ticketsLegacyRoutes from "../supportops/routes/ticketsRoutes.js";
import usersRoutes from "../supportops/routes/users.js";

// Create Fastify instance first
const app = Fastify({
  logger: true,
  bodyLimit: 1048576,
});

// Wrap everything in an async function
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
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(goalsRoutes, { prefix: "/api/goals" });
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(executionsRoutes, { prefix: "/api/executions" });
  await app.register(auditRoutes, { prefix: "/api/audit" });
  await app.register(billingRoutes, { prefix: "/api/billing" });
  await app.register(paymentsRoutes, { prefix: "/api/payments" });
  await app.register(streamRoutes, { prefix: "/api/stream" });
  await app.register(stripeRoutes, { prefix: "/api/stripe" });
  await app.register(webhooksRoutes);

  /* ========================= SUPPORTOPS ROUTES ========================= */
  await app.register(supportopsRoutes, { prefix: "/api/v1/supportops" });
  await app.register(aiRoutes, { prefix: "/api/v1/supportops/ai" });
  await app.register(aiLegacyRoutes, { prefix: "/api/v1/supportops/ai-v2" });
  await app.register(aiReviewRoutes, { prefix: "/api/v1/supportops/ai-review" });
  await app.register(channelsRoutes, { prefix: "/api/v1/supportops/channels" });
  await app.register(chatRoutes, { prefix: "/api/v1/supportops/chat" });
  await app.register(incidentsRoutes, { prefix: "/api/v1/supportops/incidents" });
  await app.register(orgAnalyticsRoutes, { prefix: "/api/v1/supportops/analytics" });
  await app.register(outboundRoutes, { prefix: "/api/v1/supportops/outbound" });
  // ❌ removed realTimeRoutes registration
  await app.register(replyServiceRoutes, { prefix: "/api/v1/supportops/replies" });
  await app.register(stripeWebhookRoutes, { prefix: "/api/v1/supportops/webhooks/stripe" });
  await app.register(ticketRulesRoutes, { prefix: "/api/v1/supportops/ticket-rules" });
  await app.register(ticketServiceRoutes, { prefix: "/api/v1/supportops/ticket-service" });
  await app.register(ticketsRoutes, { prefix: "/api/v1/supportops/tickets" });
  await app.register(ticketsLegacyRoutes, { prefix: "/api/v1/supportops/tickets-v2" });
  await app.register(usersRoutes, { prefix: "/api/v1/supportops/users" });

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

// Start the server
start();
