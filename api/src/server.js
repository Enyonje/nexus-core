import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { db } from "./db/db.js";
import { publishEvent } from "./events/publish.js";
import { executionsRoutes } from "./routes/executions.js";
import { auditRoutes } from "./routes/audit.js";
import { streamRoutes } from "./routes/stream.js";
import { authRoutes } from "./routes/auth.js";
// If you have custom WS routes, import them here:
// import { registerWsRoutes } from "./routes/ws.js";

// Define a fixed service identity for this app
const SYSTEM_IDENTITY = {
  sub: "nexus-core",   // subject identifier (service name)
  role: "service"      // role type
};

const server = Fastify({ logger: true });

// Register CORS plugin (handles OPTIONS preflight requests automatically)
await server.register(cors, {
  origin: "*", // allow all origins; restrict to your frontend origin if needed
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

// Register WebSocket plugin
await server.register(websocket);

// If you have custom WebSocket routes, register them here
// await registerWsRoutes(server);

// Health check
server.get("/health", async () => {
  const result = await db.query("SELECT 1");
  return { status: "ok", db: result.rowCount === 1 };
});

// Goals endpoint
server.post("/goals", async (req) => {
  const { org_id, user_id, goal_type, goal_payload } = req.body;

  const result = await db.query(
    `
    INSERT INTO goals (org_id, submitted_by, goal_type, goal_payload)
    VALUES ($1, $2, $3, $4)
    RETURNING id
    `,
    [org_id, user_id, goal_type, goal_payload]
  );

  const goalId = result.rows[0].id;

  // Secure event publishing: include SYSTEM_IDENTITY
  await publishEvent(db, SYSTEM_IDENTITY, "GOAL_SUBMITTED", { goalId });

  return { goalId };
});

// Register routes
server.register(executionsRoutes, { prefix: "/executions" });
server.register(auditRoutes);
server.register(streamRoutes);
await server.register(authRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen({ port: PORT, host: "0.0.0.0" });