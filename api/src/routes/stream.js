// routes/stream.js
import { registerClient, getActiveStreams, publishEvent } from "../events/stream.js";
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

        // Explicit CORS headers for SSE
        const origin = req.headers.origin;
        const allowedOrigins = [
          "https://nexusthecore.com",
          "https://nexus-core-chi.vercel.app",
          "http://localhost:3000",
          "http://localhost:5173",
        ];

        if (!origin || allowedOrigins.includes(origin)) {
          reply.raw.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": origin || "*",
            "Access-Control-Allow-Credentials": "true",
          });
        } else {
          return reply.code(403).send({ error: "Origin not allowed" });
        }

        // Register SSE client
        registerClient(executionId, reply);

        reply.raw.on("close", () => {
          server.log.info(`Stream closed for execution ${executionId}`);
        });
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
        const active = getActiveStreams();
        return reply.send({ status: "ok", activeStreams: active });
      } catch (err) {
        server.log.error("Stream health check failed:", err);
        return reply.code(500).send({ error: "Failed to check stream health" });
      }
    }
  );

  // ---------------- GOALS ----------------
  server.get("/goals", { preHandler: requireAuth }, async (req, reply) => {
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

  server.get("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { rows } = await server.pg.query(`SELECT * FROM goals WHERE id=$1`, [id]);
      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }
      return reply.send(rows[0]);
    } catch (err) {
      server.log.error("Goal fetch failed:", err);
      return reply.code(500).send({ error: "Failed to fetch goal" });
    }
  });

  server.post("/goals", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { title, description } = req.body;
      const userId = req.user.id;
      const { rows } = await server.pg.query(
        `INSERT INTO goals (user_id, title, description)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, title, description]
      );
      const goal = rows[0];
      publishEvent({ event: "goal_created", executionId: userId, data: goal });
      return reply.send(goal);
    } catch (err) {
      server.log.error("Goal creation failed:", err);
      return reply.code(500).send({ error: "Failed to create goal" });
    }
  });

  server.put("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { title, description, status } = req.body;
      const { rows } = await server.pg.query(
        `UPDATE goals SET title=$2, description=$3, status=$4, updated_at=NOW()
         WHERE id=$1 RETURNING *`,
        [id, title, description, status]
      );
      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }
      const goal = rows[0];
      publishEvent({ event: "goal_updated", executionId: goal.user_id, data: goal });
      return reply.send(goal);
    } catch (err) {
      server.log.error("Goal update failed:", err);
      return reply.code(500).send({ error: "Failed to update goal" });
    }
  });

  server.delete("/goals/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const { rows } = await server.pg.query(`DELETE FROM goals WHERE id=$1 RETURNING *`, [id]);
      if (!rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }
      const goal = rows[0];
      publishEvent({ event: "goal_deleted", executionId: goal.user_id, data: goal });
      return reply.send({ deleted: true, goal });
    } catch (err) {
      server.log.error("Goal deletion failed:", err);
      return reply.code(500).send({ error: "Failed to delete goal" });
    }
  });

  // ---------------- OBJECTIVES ----------------
  // (keep your existing objectives routes here)

  // ---------------- EXECUTIONS ----------------
  // (keep your existing executions routes here)
}
