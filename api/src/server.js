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

const server = Fastify({ logger: true });

await server.register(cors, {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

await server.register(websocket);

// Health check
server.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return { status: "ok", db: result.rowCount === 1 };
});

// Inline goal creation (optional, can remove if duplicating with goalsRoutes)
server.post("/goals", async (req) => {
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

// ✅ Register routes
server.register(executionsRoutes, { prefix: "/executions" });
server.register(auditRoutes);
server.register(streamRoutes);
await server.register(authRoutes, { prefix: "/auth" }); // ensure prefix is applied
await server.register(goalsRoutes);

const PORT = process.env.PORT || 3000;
server.listen({ port: PORT, host: "0.0.0.0" });