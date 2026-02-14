import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";

import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";
import { adminRoutes } from "./routes/admin.js";
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { billingRoutes } from "./routes/billing.js";
import { paymentsRoutes } from "./routes/payments.js";
import { streamRoutes } from "./routes/stream.js";
import { stripeRoutes } from "./routes/stripe.js"; // ✅ create-checkout-session

const app = Fastify({
  logger: true,
  bodyLimit: 1048576, // 1MB
});

/* =========================
   GLOBAL PLUGINS
========================= */
await app.register(cors, {
  origin: [
    "https://nexus-core-chi.vercel.app", // ✅ production frontend
    "http://localhost:3000",             // ✅ local dev frontend
    "http://localhost:5173",             // ✅ vite dev frontend
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

await app.register(websocket);

await app.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Register JWT plugin
await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET || "super-secret-key", // use env var in production
});

/* =========================
   RAW BODY HOOK
========================= */
app.addHook("onRequest", async (req, reply) => {
  req.rawBody = req.body;
});

/* =========================
   AUTH HOOK
========================= */
app.addHook("preHandler", async (req, reply) => {
  // Allow health check without auth
  if (req.routerPath === "/health") return;

  try {
    await req.jwtVerify(); // verifies token and sets req.user
  } catch (err) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", async () => {
  const client = await app.pg.connect();
  const result = await client.query("SELECT 1");
  client.release();
  return { status: "ok", db: result.rowCount === 1 };
});

/* =========================
   ROUTES
========================= */
app.register(authRoutes, { prefix: "/auth" });
app.register(goalsRoutes, { prefix: "/goals" });
app.register(adminRoutes, { prefix: "/admin" });
app.register(executionsRoutes, { prefix: "/executions" });
app.register(auditRoutes, { prefix: "/audit" });
app.register(billingRoutes, { prefix: "/billing" });
app.register(paymentsRoutes, { prefix: "/payments" });
app.register(streamRoutes, { prefix: "/stream" });
app.register(stripeRoutes); // ✅ now /create-checkout-session exists

/* =========================
   ERROR HANDLER
========================= */
app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({
    error: error.message || "Internal Server Error",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3001;
app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🚀 API running on port ${PORT}`);
});