import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";
import { requireAuth } from "./auth.js";

/**
 * Execution Routes
 * Mounted at /executions
 */
export async function executionsRoutes(server) {
  /* ======================================================
     GET /
     List executions (dashboard)
  ====================================================== */
  server.get(
    "/",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const userId = req.identity.sub;

        const { rows } = await db.query(
          `
          SELECT
            e.id,
            e.goal_id,
            e.status,
            e.started_at,
            e.finished_at,
            g.goal_type
          FROM executions e
          JOIN goals g ON g.id = e.goal_id
          WHERE g.user_id = $1
          ORDER BY e.started_at DESC
          LIMIT 50
          `,
          [userId]
        );

        return rows;
      } catch (err) {
        console.error("Fetch executions error:", err);
        return reply.code(500).send({ error: "Failed to load executions" });
      }
    }
  );

  /* ======================================================
     POST /:id/run
     Start execution (with FREE tier limit)
  ====================================================== */
  server.post(
    "/:id/run",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const userId = req.identity.sub;
        const { id } = req.params;

        /* 1️⃣ Verify ownership of goal */
        const goalRes = await db.query(
          `
          SELECT g.id, u.subscription
          FROM goals g
          JOIN users u ON u.id = g.user_id
          WHERE g.id = $1 AND g.user_id = $2
          `,
          [id, userId]
        );

        if (!goalRes.rowCount) {
          return reply.code(404).send({ error: "Goal not found" });
        }

        const tier = goalRes.rows[0].subscription || "free";

        /* 2️⃣ Enforce FREE tier limit */
        if (tier === "free") {
          const countRes = await db.query(
            `
            SELECT COUNT(*) 
            FROM executions e
            JOIN goals g ON g.id = e.goal_id
            WHERE g.user_id = $1
            `,
            [userId]
          );

          const used = Number(countRes.rows[0].count);

          if (used >= 3) {
            return reply.code(403).send({
              error:
                "Free plan allows only 3 executions. Upgrade to continue.",
            });
          }
        }

        /* 3️⃣ Create execution */
        const execRes = await db.query(
          `
          INSERT INTO executions (goal_id, status, started_at)
          VALUES ($1, 'RUNNING', NOW())
          RETURNING id
          `,
          [id]
        );

        const executionId = execRes.rows[0].id;

        /* 4️⃣ Fire-and-forget runner */
        runExecution(executionId).catch((err) =>
          console.error("Execution runner error:", err)
        );

        return {
          status: "started",
          executionId,
          tier,
        };
      } catch (err) {
        console.error("Run execution error:", err);
        return reply.code(500).send({ error: "Execution failed" });
      }
    }
  );

  /* ======================================================
     GET /:id
     Execution details + steps
  ====================================================== */
  server.get(
    "/:id",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const userId = req.identity.sub;
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
          WHERE e.id = $1 AND g.user_id = $2
          `,
          [id, userId]
        );

        if (!executionRes.rowCount) {
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
      } catch (err) {
        console.error("Execution detail error:", err);
        return reply.code(500).send({ error: "Failed to load execution" });
      }
    }
  );
}
