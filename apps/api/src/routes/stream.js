// routes/stream.js
import { requireAuth } from "../security/authMiddleware.js";
import { db } from "../db/db.js"; // your Postgres pool/connection

// Local map of executionId -> Set of SSE reply objects
const clients = new Map();
// Global activity stream clients
const globalClients = new Set();

/**
 * Register SSE client for a given executionId
 */
function registerClient(executionId, reply) {
  if (!clients.has(executionId)) {
    clients.set(executionId, new Set());
  }
  clients.get(executionId).add(reply);

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
 * Register global activity stream client
 */
function registerGlobalClient(reply) {
  globalClients.add(reply);
  reply.raw.on("close", () => {
    globalClients.delete(reply);
  });
}

/**
 * Emit event to all listeners for a specific execution and global stream
 */
function emitEvent(executionId, payload) {
  // Emit to global activity stream listeners
  for (const reply of globalClients) {
    try {
      reply.raw.write(`event: ${payload.event || "activity"}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      reply.log?.warn("Global SSE write failed:", err.message);
    }
  }

  // Emit to specific execution listeners
  const listeners = clients.get(executionId);
  if (!listeners) return;

  for (const reply of listeners) {
    try {
      reply.raw.write(`event: ${payload.event}\n`);
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      reply.log?.warn("SSE write failed:", err.message);
    }
  }
}

/**
 * Get active streams summary
 */
function getActiveStreams() {
  const summary = { globalListeners: globalClients.size };
  for (const [executionId, listeners] of clients.entries()) {
    summary[executionId] = listeners.size;
  }
  return summary;
}

/**
 * Subscribe to Postgres NOTIFY channel
 */
(async () => {
  try {
    const client = await db.connect();
    await client.query("LISTEN execution_events");

    client.on("notification", (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        emitEvent(payload.executionId || "global", payload);
      } catch (err) {
        console.error("Failed to parse NOTIFY payload:", err);
      }
    });
  } catch (err) {
    console.warn("Postgres LISTEN setup warning:", err.message);
  }
})();

export async function streamRoutes(server) {
  /* ===============================
     GLOBAL AGENT ACTIVITY STREAM (SSE)
  =============================== */
  server.get(
    "/agents/activity/stream",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const origin = req.headers.origin;
        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000",
        ];

        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Org-Id",
        });

        // Initial handshake event
        reply.raw.write(
          `data: ${JSON.stringify({
            event: "nexus_connected",
            description: "Neural activity link established successfully.",
            data: { system: "Nexus Core Stream", status: "Synchronized" },
          })}\n\n`
        );

        registerGlobalClient(reply);
      } catch (err) {
        server.log.error("Global Activity Stream error:", err);
        return reply.code(500).send({ error: "Stream Failure", detail: err.message });
      }
    }
  );

  /* ===============================
     SSE STREAM (INDIVIDUAL EXECUTION TRACE)
  =============================== */
  server.get(
    "/executions/:executionId/stream",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const origin = req.headers.origin;
        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000",
        ];

        reply.raw.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
          "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Org-Id",
        });

        reply.raw.write(
          `data: ${JSON.stringify({
            event: "nexus_connected",
            description: "Neural execution trace active.",
            data: { system: "Neural Link Alpha", status: "Synchronized" },
          })}\n\n`
        );

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
  server.get("/stream/health", { preHandler: requireAuth }, async (_req, reply) => {
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
  server.get("/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      ).catch(() => ({ rows: [] }));
      return rows;
    } catch (err) {
      server.log.error("Goal list failed:", err);
      return reply.code(500).send({ error: "Failed to list goals" });
    }
  });
}

export default streamRoutes;