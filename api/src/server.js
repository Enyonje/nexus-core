import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { db } from "./db/db.js";
import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";

const app = Fastify({
  logger: true,
  bodyLimit: 1048576, // 1MB
});

/* =========================
   GLOBAL PLUGINS
========================= */

// CORS (Vercel + local dev safe)
await app.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// WebSocket (safe to keep)
await app.register(websocket);

// Enable rawBody (Stripe-safe)
app.addHook("onRequest", async (req, reply) => {
  req.rawBody = req.body;
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return { status: "ok", db: result.rowCount === 1 };
});

/* =========================
   ROUTES
========================= */

// AUTH → /auth/login, /auth/subscription, etc
app.register(authRoutes, { prefix: "/auth" });

// GOALS → /goals (DO NOT double-prefix)
app.register(goalsRoutes);

/* =========================
   ERROR HANDLER (IMPORTANT)
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
