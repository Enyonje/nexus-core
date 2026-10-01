import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";

// Import validated env first
import { env } from "./config/env.js";

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

// Import SupportOps JS Route Plugins
import { aiRoutes } from "../supportops/routes/aiRoutes.js";
import { aiReviewRoutes } from "../supportops/routes/aiReviewRoutes.js";
import { incidentsRoutes } from "../supportops/routes/incidents.js";
import { orgAnalyticsRoutes } from "../supportops/routes/orgAnalyticsRoutes.js";
import { stripeWebhookRoutes } from "../supportops/routes/stripeWebhook.js";
import { ticketsRoutes } from "../supportops/routes/tickets.js";;
import { usersRoutes } from "../supportops/routes/users.js";

const app = Fastify({
  logger: true,
  bodyLimit: 1048576,
});

/* =========================
   PLUGINS
========================= */

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
      ? {
        ca: env.PG_CA_CERT,
        rejectUnauthorized: false,
      }
      : false,
});

await app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
});

/* =========================
   ROUTES & CRON PING
========================= */
app.register(authRoutes, { prefix: "/api/auth" });
app.register(goalsRoutes, { prefix: "/api/goals" });
app.register(adminRoutes, { prefix: "/api/admin" });
app.register(executionsRoutes, { prefix: "/api/executions" });
app.register(auditRoutes, { prefix: "/api/audit" });
app.register(billingRoutes, { prefix: "/api/billing" });
app.register(paymentsRoutes, { prefix: "/api/payments" });
app.register(streamRoutes, { prefix: "/api/stream" });
app.register(stripeRoutes, { prefix: "/api/stripe" });
app.register(webhooksRoutes);



/* =========================
   SUPPORTOPS ROUTE REGISTRATION
========================= */

app.register(aiRoutes, { prefix: "/api/v1/supportops/ai" });
app.register(aiReviewRoutes, { prefix: "/api/v1/supportops/ai-review" });
app.register(incidentsRoutes, { prefix: "/api/v1/supportops/incidents" });
app.register(orgAnalyticsRoutes, { prefix: "/api/v1/supportops/analytics" });
app.register(ticketsRoutes, { prefix: "/api/v1/supportops/tickets" });
app.register(stripeWebhookRoutes, { prefix: "/api/v1/supportops/webhooks/stripe" });
app.register(usersRoutes, { prefix: "/api/v1/supportops/users" });


app.get("/api/health", async () => {
  const client = await app.pg.connect();
  try {
    const result = await client.query("SELECT 1");
    return { status: "ok", db: result.rowCount === 1 };
  } finally {
    client.release();
  }
});

// ✅ Cron Keep-Alive Route using validated PING_SECRET_KEY
app.get("/api/cron/keep-alive", async (request, reply) => {
  const secret = request.headers["x-cron-secret"] || request.query.secret;

  if (secret !== env.PING_SECRET_KEY) {
    return reply.code(401).send({ error: "UNAUTHORIZED_CRON_REQUEST" });
  }

  try {
    const client = await app.pg.connect();
    await client.query("SELECT 1");
    client.release();

    app.log.info(" Cron ping executed successfully");
    return reply.send({ status: "success", timestamp: new Date().toISOString() });
  } catch (err) {
    app.log.error({ err }, "Cron ping failed");
    return reply.code(500).send({ error: "DATABASE_PING_FAILED" });
  }
});

/* =========================
   ERROR HANDLER & LISTEN
========================= */
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({
    error: error.message || "Internal Server Error",
  });
});

app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🚀 API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});