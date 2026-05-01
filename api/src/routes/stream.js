import { registerClient, getActiveStreams } from "../events/stream.js";
import { requireAuth } from "./auth.js";
import { publishEvent } from "../execution/executions.js"; // make sure this is the right path

export async function streamRoutes(server) {
  // SSE stream for executions
  server.get(
    "/api/executions/:executionId/stream", // align with frontend/backend
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const origin = req.headers.origin;

        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:5173",
        ];

        if (!origin || allowedOrigins.includes(origin)) {
          reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Credentials": "true",
          });
        } else {
          return reply.code(403).send({ error: "Access Denied: Origin Mismatch" });
        }

        reply.raw.write(`data: ${JSON.stringify({
          event: "nexus_connected",
          data: { system: "Neural Link Alpha", status: "Synchronized" }
        })}\n\n`);

        registerClient(executionId, reply);

        req.raw.on("close", () => {
          server.log.info(`Nexus Link Terminated for ${executionId}`);
        });
      } catch (err) {
        server.log.error("Nexus Stream Error:", err);
        return reply.code(500).send({ error: "Neural Link Failure" });
      }
    }
  );

  // Health check
  server.get("/api/stream/health", { preHandler: requireAuth }, async (_req, reply) => {
    try {
      const active = getActiveStreams();
      return reply.send({ status: "ok", activeStreams: active });
    } catch (err) {
      server.log.error("Stream health check failed:", err);
      return reply.code(500).send({ error: "Failed to check stream health" });
    }
  });

  // Goals CRUD (make sure publishEvent is imported)
  server.get("/api/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      return reply.send(rows);
    } catch (err) {
      server.log.error("Goal list failed:", err);
      return reply.code(500).send({ error: "Failed to list goals" });
    }
  });

  // ... keep your other goal routes, but ensure publishEvent is imported
}


  // ---------------- OBJECTIVES ----------------
  // (keep your existing objectives routes here)

  // ---------------- EXECUTIONS ----------------
  // (keep your existing executions routes here)
}
