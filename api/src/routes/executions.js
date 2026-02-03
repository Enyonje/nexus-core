// src/routes/executions.js
import { v4 as uuidv4 } from "uuid";
import { runExecution } from "../execution/runner.js";

export async function executionsRoutes(app) {
  /* ======================================================
     GET /executions – list executions
  ====================================================== */
  app.get("/", async (req, reply) => {
    try {
      const { rows } = await app.pg.query(
        `SELECT * FROM executions ORDER BY started_at DESC NULLS LAST`
      );
      return { executions: rows };
    } catch (err) {
      req.log.error("GET /executions failed:", err);
      return reply.code(500).send({ error: "Failed to load executions" });
    }
  });

  /* ======================================================
     POST /executions – create execution from a goal
  ====================================================== */
  app.post("/", async (req, reply) => {
    try {
      const { goalId } = req.body;
      if (!goalId) {
        return reply.code(400).send({ error: "goalId is required" });
      }

      const goalRes = await app.pg.query(
        `SELECT id, goal_type, goal_payload FROM goals WHERE id = $1`,
        [goalId]
      );
      if (goalRes.rows.length === 0) {
        return reply.code(404).send({ error: "Goal not found" });
      }
      const goal = goalRes.rows[0];

      const execRes = await app.pg.query(
        `INSERT INTO executions (id, goal_id, goal_type, goal_payload, version, status, started_at)
         VALUES ($1, $2, $3, $4, 1, 'pending', NOW())
         RETURNING *`,
        [uuidv4(), goal.id, goal.goal_type, goal.goal_payload]
      );

      return reply.code(201).send({ execution: execRes.rows[0] });
    } catch (err) {
      req.log.error("POST /executions failed:", err);
      return reply.code(500).send({ error: "Failed to create execution" });
    }
  });

  /* ======================================================
     POST /executions/:id/run – start execution
  ====================================================== */
  app.post("/:id/run", async (req, reply) => {
    try {
      const { id } = req.params;
      const execRes = await app.pg.query(
        `UPDATE executions
         SET status = 'running', started_at = COALESCE(started_at, NOW())
         WHERE id = $1 RETURNING *`,
        [id]
      );
      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found" });
      }

      // Trigger runner asynchronously
      runExecution(id).catch(err => req.log.error("Runner failed:", err));

      return { execution: execRes.rows[0] };
    } catch (err) {
      req.log.error("POST /executions/:id/run failed:", err);
      return reply.code(500).send({ error: "Failed to run execution" });
    }
  });

  /* ======================================================
     GET /executions/:id – detail
  ====================================================== */
  app.get("/:id", async (req, reply) => {
    try {
      const { id } = req.params;
      const execRes = await app.pg.query(
        `SELECT * FROM executions WHERE id = $1`,
        [id]
      );
      if (execRes.rows.length === 0) {
        return reply.code(404).send({ error: "Execution not found" });
      }
      return { execution: execRes.rows[0] };
    } catch (err) {
      req.log.error("GET /executions/:id failed:", err);
      return reply.code(500).send({ error: "Failed to load execution" });
    }
  });
}