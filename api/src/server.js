import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { db } from "./db/db.js";

// Routes
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { streamRoutes } from "./routes/stream.js";
import { authRoutes, requireAuth } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";

const app = Fastify({
  logger: true,
});

/* ----------------------------- CORS ----------------------------- */
await app.register(cors, {
  origin: [
    "http://localhost:5173",
    "https://nexus-core-chi.vercel.app",
    "https://nexus-core-a0px.onrender.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

/* -------------------------- WebSockets -------------------------- */
await app.register(websocket);

/* -------------------------- Health Check ------------------------ */
app.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return {
    status: "ok",
    db: result.rowCount === 1,
    uptime: process.uptime(),
  };
});

/* ----------------------------- Routes --------------------------- */

// Public / Auth
await app.register(authRoutes, { prefix: "/auth" });

// Protected routes
await app.register(executionsRoutes, {
  prefix: "/executions",
  preHandler: requireAuth,
});

await app.register(goalsRoutes, {
  prefix: "/goals",
  preHandler: requireAuth,
});

await app.register(auditRoutes, {
  prefix: "/audit",
  preHandler: requireAuth,
});

await app.register(streamRoutes, {
  prefix: "/stream",
  preHandler: requireAuth,
});

/* ----------------------------- Server --------------------------- */
const PORT = process.env.PORT || 3001;

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`🚀 API running on port ${PORT}`);
});
