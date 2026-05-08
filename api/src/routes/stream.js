import { registerClient, getActiveStreams } from "../events/stream.js";
import { requireAuth } from "./auth.js";
import { publishEvent } from "./executions.js"; 

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
          "http://localhost:3000"
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
        reply.raw.write(`data: ${JSON.stringify({
          event: "nexus_connected",
          data: { system: "Neural Link Alpha", status: "Synchronized" }
        })}\n\n`);

        // Register client in your event system
        registerClient(executionId, reply);

        // Cleanup on disconnect
        req.raw.on("close", () => {
          server.log.info(`SSE connection closed for execution ${executionId}`);
          // Unregister client if needed
        });

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
