import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

export async function executionsRoutes(server) {
  // LIST EXECUTIONS
  server.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;

      const client = await server.pg.connect();
      const { rows } = await client.query(
        `SELECT
           e.id,
           e.status,
           e.started_at,
           e.finished_at,
           g.goal_type,
           g.goal_payload
         FROM executions e
         JOIN goals g ON g.id = e.goal_id
         WHERE g.submitted_by = $1
         ORDER BY e.started_at DESC
         LIMIT 20`,
        [userId]
      );
      client.release();

      return reply.send(rows);
    } catch (err) {
      server.log.error("Fetch executions failed:", err);
      return reply.code(500).send({ error: "Failed to load executions" });
    }
  });

  // RUN EXECUTION
  server.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const client = await server.pg.connect();
      const subRes = await client.query(
        "SELECT subscription FROM users WHERE id = $1",
        [userId]
      );
      const tier = subRes.rows[0]?.subscription || "free";

      if (tier === "free") {
        const countRes = await client.query(
          `SELECT COUNT(*)
           FROM executions e
           JOIN goals g ON g.id = e.goal_id
           WHERE g.submitted_by = $1`,
          [userId]
        );

        if (Number(countRes.rows[0].count) >= 5) {
          client.release();
          return reply.code(403).send({
            error: "Free tier limit reached. Upgrade to continue.",
          });
        }
      }

      client.release();

      runExecution(id);
      return reply.send({ status: "started", executionId: id });
    } catch (err) {
      server.log.error("Execution start failed:", err);
      return reply.code(500).send({ error: "Failed to start execution" });
    }
  });
}