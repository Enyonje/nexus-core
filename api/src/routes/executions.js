// routes/executions.js
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

export async function executionsRoutes(server) {
  // LIST EXECUTIONS (GET /executions)
  server.get("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const client = await server.pg.connect();

      const result = await client.query(
        `SELECT e.id, e.status, e.started_at, e.finished_at, e.goal_id
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

  // CREATE EXECUTION FROM GOAL (POST /executions)
  server.post("/", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity.sub;
      const { goalId } = req.body;

      if (!goalId) {
        return reply.code(400).send({ error: "goalId is required" });
      }

      const client = await server.pg.connect();
      const result = await client.query(
        `INSERT INTO executions (goal_id, status, started_at)
         SELECT $1, 'pending', NOW()
         WHERE EXISTS (SELECT 1 FROM goals WHERE id = $1 AND submitted_by = $2)
         RETURNING id, status, started_at, goal_id`,
        [goalId, userId]
      );
      client.release();

      if (!result.rows.length) {
        return reply.code(404).send({ error: "Goal not found" });
      }

      return reply.send(result.rows[0]);
    } catch (err) {
      server.log.error("Create execution failed:", err);
      return reply.code(500).send({ error: "Failed to create execution" });
    }
  });

  // EXECUTION DETAIL (GET /executions/:id)
  server.get("/:id", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { id } = req.params;
      const userId = req.identity.sub;
      const client = await server.pg.connect();

      const execRes = await client.query(
        `SELECT e.id, e.status, e.started_at, e.finished_at, e.goal_id
         FROM executions e
         JOIN goals g ON g.id = e.goal_id
         WHERE e.id = $1 AND g.submitted_by = $2`,
        [id, userId]
      );

      if (execRes.rows.length === 0) {
        client.release();
        return reply.code(404).send({ error: "Execution not found" });
      }

      const stepsRes = await client.query(
        `SELECT s.id, s.name, s.status, s.started_at, s.finished_at
         FROM execution_steps s
         WHERE s.execution_id = $1
         ORDER BY s.started_at ASC`,
        [id]
      );

      client.release();

      return {
        ...execRes.rows[0],
        steps: stepsRes.rows || [],
      };
    } catch (err) {
      server.log.error("Execution detail failed:", err);
      return reply.code(500).send({ error: "Failed to fetch execution detail" });
    }
  });

  // RUN EXECUTION (POST /executions/:id/run)
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

  // STREAM EXECUTION EVENTS (GET /executions/:id/stream)
  server.get("/:id/stream", { preHandler: requireAuth }, async (req, reply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    const executionId = req.params.id;

    // Example: push heartbeat events
    const interval = setInterval(() => {
      reply.raw.write(`event: heartbeat\ndata: {"executionId":"${executionId}"}\n\n`);
    }, 5000);

    req.raw.on("close", () => {
      clearInterval(interval);
    });
  });
}