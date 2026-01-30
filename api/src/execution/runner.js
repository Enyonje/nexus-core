import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { checkAiQuota, incrementAiUsage } from "../usage/aiQuota.js";

export async function runExecution(executionId) {
  const { rows } = await db.query(
    `
    SELECT
      e.id,
      e.goal_id,
      g.goal_type,
      g.goal_payload,
      u.id AS user_id,
      u.subscription,
      u.role
    FROM executions e
    JOIN goals g ON g.id = e.goal_id
    JOIN users u ON u.id = g.user_id
    WHERE e.id = $1
    `,
    [executionId]
  );

  if (!rows.length) {
    throw new Error("Execution not found");
  }

  const execution = rows[0];

  const user = {
    id: execution.user_id,
    subscription: execution.subscription,
    role: execution.role,
  };

  try {
    /* =========================
       AI QUOTA CHECK
    ========================= */
    if (execution.goal_type.startsWith("ai_")) {
      await checkAiQuota(user);
    }

    await db.query(
      `UPDATE executions SET status = 'running' WHERE id = $1`,
      [executionId]
    );

    const result = await executeGoalLogic(
      execution.goal_type,
      execution.goal_payload,
      executionId
    );

    if (execution.goal_type.startsWith("ai_")) {
      await incrementAiUsage(user);
    }

    await db.query(
      `
      UPDATE executions
      SET status = 'completed',
          finished_at = NOW(),
          result = $2
      WHERE id = $1
      `,
      [executionId, result]
    );
  } catch (err) {
    await db.query(
      `
      UPDATE executions
      SET status = 'failed',
          finished_at = NOW(),
          error = $2
      WHERE id = $1
      `,
      [executionId, err.message]
    );

    throw err;
  }
}
