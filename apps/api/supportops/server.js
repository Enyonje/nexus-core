import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";

import { prisma, disconnectPrisma } from "./config/prisma.js";
import dashboardRoutes from "./routes/dashboard.js";
import aiRoutes from "./routes/ai.js";
import aiLegacyRoutes from "./routes/aiRoutes.js";
import aiReviewRoutes from "./routes/aiReviewRoutes.js";
import channelsRoutes from "./routes/channelsRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import incidentsRoutes from "./routes/incidents.js";
import orgAnalyticsRoutes from "./routes/orgAnalyticsRoutes.js";
import supportopsRoutes from "./routes/supportops.js";
import ticketsRoutes from "./routes/ticketsRoutes.js";
import legacyTicketsRoutes from "./routes/tickets.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import readinessRoutes from "./routes/readinessRoutes.js";
import billingRoutes, { stripeWebhookPlugin } from "./routes/billingRoutes.js";
import { initializeRealtime, closeRealtime, getRealtimeStatus } from "./routes/realtime.js";

const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024, trustProxy: true });
const frontendOrigins = new Set([
  "https://supportops.nexusthecore.com",
  "https://nexusthecore.com",
  "http://localhost:5173",
  "http://localhost:3000",
  ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
]);

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || frontendOrigins.has(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Org-Id", "X-App-Slug", "Accept", "Cache-Control", "Last-Event-ID"],
  exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
});
await app.register(cookie);
await app.register(rateLimit, { max: Number(process.env.RATE_LIMIT_MAX || 120), timeWindow: "1 minute" });
await app.register(websocket);

const registerBoth = async (plugin, path) => {
  await app.register(plugin, { prefix: `/api/v1/${path}` });
  await app.register(plugin, { prefix: `/api/${path}` });
};

app.get("/", async () => ({ service: "SupportOps API", version: "1.0.0", status: "ok" }));
app.get("/health", async () => ({ status: "ok", service: "supportops", timestamp: new Date().toISOString() }));
app.get("/api/health", async () => ({ status: "ok", service: "supportops", timestamp: new Date().toISOString() }));
app.get("/api/v1/system/health", async () => ({ status: "ok", service: "supportops", realtime: getRealtimeStatus(), timestamp: new Date().toISOString() }));

// Dashboard routes expose /dashboard/metrics and /metrics under the API root.
await registerBoth(dashboardRoutes, "");
await registerBoth(ticketsRoutes, "supportops/tickets");
await registerBoth(channelsRoutes, "supportops/tickets/channels");
await registerBoth(chatRoutes, "supportops/chat");
await registerBoth(inviteRoutes, "supportops/invites");
await registerBoth(readinessRoutes, "supportops/readiness");
await registerBoth(legacyTicketsRoutes, "supportops/tickets-legacy");
await registerBoth(aiRoutes, "supportops/ai");
await registerBoth(aiLegacyRoutes, "supportops/ai-v2");
await registerBoth(aiReviewRoutes, "supportops/ai-review");
await registerBoth(incidentsRoutes, "supportops/incidents");
await registerBoth(orgAnalyticsRoutes, "supportops/analytics");
// Use the billing module's signature-verified, idempotent Stripe handler.
// The legacy stripeWebhook.js handler only logged events and did not sync entitlements.
await app.register(stripeWebhookPlugin, { prefix: "/api/v1/supportops/webhooks" });
await app.register(stripeWebhookPlugin, { prefix: "/api/supportops/webhooks" });
await registerBoth(supportopsRoutes, "supportops");
await registerBoth(billingRoutes, "billing");

app.setNotFoundHandler((request, reply) => reply.code(404).send({
  statusCode: 404, error: "Not Found", message: `Route ${request.method}:${request.url} not found`,
}));
app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, "SupportOps request failed");
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    statusCode, error: error.name || "Internal Server Error",
    message: process.env.NODE_ENV === "production" && statusCode >= 500 ? "An internal error occurred" : error.message,
  });
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "Shutting down SupportOps API");
  try { await app.close(); } catch (error) { app.log.error(error); }
  try { await closeRealtime(); } catch (error) { app.log.error(error); }
  try { await disconnectPrisma(); } catch (error) { app.log.error(error); }
  process.exit(0);
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured");
  await prisma.$connect();
  await initializeRealtime();
  const port = Number(process.env.PORT || 10000);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info({ port }, "SupportOps API is listening");
}

start().catch(async (error) => {
  app.log.error(error, "SupportOps API failed to start");
  try { await closeRealtime(); } catch {}
  try { await disconnectPrisma(); } catch {}
  process.exit(1);
});
