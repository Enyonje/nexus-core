import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { db } from "./db/db.js";
import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";

const app = Fastify({
  logger: true,
});

// CORS (allow Vercel frontend)
await app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// WebSocket
await app.register(websocket);

// Health check
app.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return { status: "ok", db: result.rowCount === 1 };
});

// Routes
app.register(authRoutes, { prefix: "/auth" });
app.register(goalsRoutes, { prefix: "/goals" });

// Start server
const PORT = process.env.PORT || 3001;
await app.listen({ port: PORT, host: "0.0.0.0" });
