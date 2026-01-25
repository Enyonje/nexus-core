import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { db } from "./db/db.js";
import { publishEvent } from "./events/publish.js";
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { streamRoutes } from "./routes/stream.js";
import { authRoutes } from "./routes/auth.js";
import { goalsRoutes } from "./routes/goals.js";

const SYSTEM_IDENTITY = {
  sub: "nexus-core",
  role: "service",
};

const app = Fastify({ logger: true });

// Register CORS
await app.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Register WebSocket
await app.register(websocket);

// Health check
app.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return { status: "ok", db: result.rowCount === 1 };
});

// Inline goal creation (optional, can remove if duplicating with goalsRoutes)
app.post("/goals", async (req: any) => {
  const { org_id, user_id, goal_type, goal_payload } = req.body;

  const result = await db.query(
    `INSERT INTO goals (org_id, submitted_by, goal_type, goal_payload)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [org_id, user_id, goal_type, goal_payload]
  );

  const goalId = result.rows[0].id;
  await publishEvent(db, SYSTEM_IDENTITY, "GOAL_SUBMITTED", { goalId });

  return { goalId };
});

// ✅ Register routes with proper prefixes
app.register(executionsRoutes, { prefix: "/executions" });
app.register(auditRoutes);
app.register(streamRoutes);
await app.register(authRoutes, { prefix: "/auth" }); // important for /auth/subscription
await app.register(goalsRoutes);

const PORT = process.env.PORT || 3001;
app.listen({ port: PORT, host: "0.0.0.0" });