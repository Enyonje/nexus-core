// routes/executions.js
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

export async function executionsRoutes(server) {
  // LIST EXECUTIONS
  server.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const client = await server.pg.connect();

      const result = await client.query(
        `SELECT e.id, e.status, e.started_at, e.finished_at
         FROM executions e
         JOIN goals g ON g.id = e.goal_id
         WHERE g.submitted_by = $1
         ORDER BY e.started_at DESC
         LIMIT 20`,
        [userId]
      );

      client.release();
      return { executions: result.rows };
    } catch (err) {
      server.log.error("Execution list failed:", err);
      return reply.code(500).send({ error: "Failed to fetch executions" });
    }
  });

  // RUN EXECUTION
  server.post("/:id/run", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { id } = req.params;

      const client = await server.pg.connect();
      const subRes = await client.query(
        "SELECT subscription, role FROM users WHERE id = $1",
        [userId]
      );
      const tier = subRes.rows[0]?.subscription || "free";
      const role = subRes.rows[0]?.role || "user";

      if (role === "admin") {
        client.release();
        await runExecution(id);
        return reply.send({ status: "started", executionId: id, override: true });
      }

      const userTz = req.headers["x-timezone"] || "UTC";

      if (tier === "free") {
        const countRes = await client.query(
          `SELECT COUNT(*) 
           FROM executions e
           JOIN goals g ON g.id = e.goal_id
           WHERE g.submitted_by = $1
             AND e.started_at AT TIME ZONE $2 >= date_trunc('day', now() AT TIME ZONE $2)
             AND e.started_at AT TIME ZONE $2 < date_trunc('day', now() AT TIME ZONE $2) + interval '1 day'`,
          [userId, userTz]
        );

        if (Number(countRes.rows[0].count) >= 3) {
          client.release();
          return reply.code(403).send({
            error: "Free tier daily limit reached (3 per day). Upgrade to continue.",
          });
        }
      }

      client.release();
      await runExecution(id);
      return reply.send({ status: "started", executionId: id });
    } catch (err) {
      server.log.error("Execution start failed:", err);
      return reply.code(500).send({ error: "Failed to start execution" });
    }
  });
}