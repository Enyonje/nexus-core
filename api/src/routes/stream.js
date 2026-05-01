import { registerClient, getActiveStreams } from "../events/stream.js";
import { requireAuth } from "./auth.js";
// Path is likely ./executions.js if they are in the same directory
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

        // Unified origin list from your previous logs
        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000"
        ];

        // Set Headers for SSE and CORS
        if (!origin || allowedOrigins.includes(origin)) {
          reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", // CRITICAL for Render.com/Nginx
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Credentials": "true",
          });
        } else {
          return reply.code(403).send({ error: "Access Denied: Origin Mismatch" });
        }

        // Initial Handshake - Matches StreamPage.jsx expectation
        reply.raw.write(`data: ${JSON.stringify({
          event: "nexus_connected",
          data: { system: "Neural Link Alpha", status: "Synchronized" }
        })}\n\n`);

        // Attach to the event system
        registerClient(executionId, reply);

        // Cleanup on disconnect
        req.raw.on("close", () => {
          server.log.info(`Nexus Link Terminated for ${executionId}`);
          // Add logic here to unregister if your event system requires it
        });

      } catch (err) {
        server.log.error("Nexus Stream Error:", err);
        return reply.code(500).send({ error: "Neural Link Failure" });
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
     GOALS (Required for Dashboard View)
  =============================== */
  server.get("/api/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      // Use req.user.id to match the updated Auth middleware
      const userId = req.user.id; 
      const { rows } = await server.pg.query(
        `SELECT * FROM goals WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      return rows; // Return flat array for dashboard mapping
    } catch (err) {
      server.log.error("Goal list failed:", err);
      return reply.code(500).send({ error: "Failed to list goals" });
    }
  });
}