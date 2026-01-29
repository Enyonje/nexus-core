import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

export async function executionsRoutes(server) {
  // LIST EXECUTIONS
  server.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;

      const { rows } = await db.query(
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

      return reply.send(rows);
    } catch (err) {
      console.error("Fetch executions failed:", err);
      return reply.code(500).send({ error: "Failed to load executions" });
    }
  });

  // RUN EXECUTION
  server.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const subRes = await db.query(
        "SELECT subscription FROM users WHERE id = $1",
        [userId]
      );
      const tier = subRes.rows[0]?.subscription || "free";

      if (tier === "free") {
        const countRes = await db.query(
          `SELECT COUNT(*)
           FROM executions e
           JOIN goals g ON g.id = e.goal_id
           WHERE g.submitted_by = $1`,
          [userId]
        );

        if (Number(countRes.rows[0].count) >= 5) {
          return reply.code(403).send({
            error: "Free tier limit reached. Upgrade to continue.",
          });
        }
      }

      runExecution(id);
      return reply.send({ status: "started", executionId: id });
    } catch (err) {
      console.error("Execution start failed:", err);
      return reply.code(500).send({ error: "Failed to start execution" });
    }
  });
}