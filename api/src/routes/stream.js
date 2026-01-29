import { registerClient, getActiveStreams } from "../events/stream.js";
import { requireAuth } from "./auth.js";

export async function streamRoutes(server) {
  // STREAM EXECUTION EVENTS
  server.get(
    "/stream/:executionId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;

        if (!executionId) {
          return reply.code(400).send({ error: "executionId is required" });
        }

        // Register the client for streaming updates
        registerClient(Number(executionId), reply);
      } catch (err) {
        server.log.error("Stream route failed:", err);
        return reply.code(500).send({ error: "Failed to open stream" });
      }
    }
  );

  // STREAM HEALTH CHECK
  server.get(
    "/stream/health",
    { preHandler: requireAuth },
    async (_req, reply) => {
      try {
        const active = getActiveStreams(); // should return a map or count of connected clients
        return reply.send({
          status: "ok",
          activeStreams: active,
        });
      } catch (err) {
        server.log.error("Stream health check failed:", err);
        return reply.code(500).send({ error: "Failed to check stream health" });
      }
    }
  );
}