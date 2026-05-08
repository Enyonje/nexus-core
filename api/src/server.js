import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";

import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";
import { adminRoutes } from "./routes/admin.js";
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { billingRoutes } from "./routes/billing.js";
import { paymentsRoutes } from "./routes/payments.js";
import { streamRoutes } from "./routes/stream.js";
import { stripeRoutes } from "./routes/stripe.js";

const app = Fastify({
  logger: true,
  bodyLimit: 1048576, // 1MB
});

/* =========================
   PLUGINS
========================= */

// ✅ Register CORS FIRST
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
  secret: process.env.COOKIE_SECRET || "cookie_secret",
  parseOptions: {},
});

await app.register(websocket);

await app.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          ca: process.env.PG_CA_CERT,
          rejectUnauthorized: false,
        }
      : false,
});

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "super-secret-key",
});

/* =========================
   ROUTES
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

app.get("/api/health", async () => {
  const client = await app.pg.connect();
  const result = await client.query("SELECT 1");
  client.release();
  return { status: "ok", db: result.rowCount === 1 };
});

/* =========================
   ERROR HANDLER
========================= */
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({
    error: error.message || "Internal Server Error",
  });
});

app.ready().then(() => {
  console.log(app.printRoutes());
});

const PORT = process.env.PORT || 3001;
app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🚀 API running on port ${PORT}`);
});
