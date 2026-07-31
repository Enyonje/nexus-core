// routes/stream.js
import { requireAuth } from "./auth.js";
import { db } from "../db/db.js"; // your Postgres pool/connection

// Local map of executionId -> Set of SSE reply objects
const clients = new Map();

/**
 * Register SSE client for a given executionId
 */
function registerClient(executionId, reply) {
  if (!clients.has(executionId)) {
    clients.set(executionId, new Set());
  }
  clients.get(executionId).add(reply);

  // Cleanup on disconnect
  reply.raw.on("close", () => {
    const listeners = clients.get(executionId);
    if (listeners) {
      listeners.delete(reply);
      if (listeners.size === 0) {
        clients.delete(executionId);
      }
    }
  });
}

/**
 * Emit event to all listeners for a specific execution
 */
function emitEvent(executionId, payload) {
  const listeners = clients.get(executionId);
  if (!listeners) return;

  for (const reply of listeners) {
    try {
      reply.raw.write(`event: ${payload.event}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      reply.log.warn("SSE write failed:", err.message);
    }
  }
}

/**
 * Get active streams summary
 */
function getActiveStreams() {
  const summary = {};
  for (const [executionId, listeners] of clients.entries()) {
    summary[executionId] = listeners.size;
  }
  return summary;
}

/**
 * Subscribe to Postgres NOTIFY channel
 */
(async () => {
  const client = await db.connect();
  await client.query("LISTEN execution_events");

  client.on("notification", (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      if (payload.executionId) {
        emitEvent(payload.executionId, payload);
      }
    } catch (err) {
      console.error("Failed to parse NOTIFY payload:", err);
    }
  });
})();

export async function streamRoutes(server) {
  /* ===============================
     SSE STREAM (LIVE TRACE)
  =============================== */
  server.get(
    "/api/executions/:executionId/stream",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const origin = req.headers.origin;

        // Allowed origins
        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000",
        ];

        // Validate origin
        if (!origin || allowedOrigins.includes(origin)) {
          reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // CRITICAL for Render/Cloudflare
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          });
        } else {
          return reply.code(403).send({ error: "Access Denied: Origin Mismatch" });
        }

        // Initial handshake event
        reply.raw.write(
          `data: ${JSON.stringify({
            event: "nexus_connected",
            data: { system: "Neural Link Alpha", status: "Synchronized" },
          })}\n\n`
        );

        // Register client
        registerClient(executionId, reply);
      } catch (err) {
        server.log.error("Stream error:", err);
        return reply.code(500).send({ error: "Stream Failure", detail: err.message });
      }
    }
  );

  /* ===============================
     STREAM HEALTH
  =============================== */
  server.get("/api/stream/health", { preHandler: requireAuth }, async (_req, reply) => {
    try {
      const active = getActiveStreams();
      return { status: "ok", activeStreams: active };
    } catch (err) {
      server.log.error("Stream health check failed:", err);
      return reply.code(500).send({ error: "Internal Monitoring Failure" });
    }
  });

  /* ===============================
     GOALS (Dashboard View)
  =============================== */
  server.get("/api/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      return rows;
    } catch (err) {
      server.log.error("Goal list failed:", err);
      return reply.code(500).send({ error: "Failed to list goals" });
    }
  });
}
