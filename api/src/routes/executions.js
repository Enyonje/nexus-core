import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";

/**
 * Register execution routes
 */
export async function executionsRoutes(server) {
  /**
   * GET /
   * Returns latest executions for dashboard list
   * Mounted at /executions
   */
  server.get("/", async () => {
    const { rows } = await db.query(`
      SELECT
        e.id,
        e.goal_id,
        e.status,
        e.started_at,
        e.finished_at,
        g.goal_type
      FROM executions e
      JOIN goals g ON g.id = e.goal_id
      ORDER BY e.started_at DESC
      LIMIT 50
    `);

    return rows;
  });

  /**
   * POST /:id/run
   * Starts execution (fire-and-forget)
   * Mounted at /executions/:id/run
   */
  server.post("/:id/run", async (req) => {
    const { id } = req.params;

    runExecution(id); // fire-and-forget

    return { status: "started", executionId: id };
  });

  /**
   * GET /:id
   * Returns execution + steps
   * Mounted at /executions/:id
   */
  server.get("/:id", async (req, reply) => {
    const { id } = req.params;

    const executionRes = await db.query(
      `
      SELECT
        e.id,
        e.goal_id,
        e.status,
        e.started_at,
        e.finished_at,
        g.goal_type,
        g.goal_payload
      FROM executions e
      JOIN goals g ON g.id = e.goal_id
      WHERE e.id = $1
      `,
      [id]
    );

    if (executionRes.rowCount === 0) {
      return reply.code(404).send({ error: "Execution not found" });
    }

    const stepsRes = await db.query(
      `
      SELECT
        id,
        step_type,
        status,
        input,
        output,
        error,
        created_at
      FROM execution_steps
      WHERE execution_id = $1
      ORDER BY created_at ASC
      `,
      [id]
    );

    return {
      execution: executionRes.rows[0],
      steps: stepsRes.rows,
    };
  });
}