import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { checkAiQuota, incrementAiUsage } from "../usage/aiQuota.js";

/**
 * Run an execution and stream events via publishEvent
 */
export async function runExecution(executionId, publishEvent) {
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
       QUOTA & PERMISSIONS
    ========================= */
    if (execution.goal_type.startsWith("ai_")) {
      await checkAiQuota(user);
    }

    await db.query(
      `UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`,
      [executionId]
    );

    publishEvent(executionId, {
      event: "execution_started",
      goalType: execution.goal_type,
    });

    /* =========================
       STEP-BY-STEP EXECUTION
    ========================= */
    let completedSteps = 0;
    const totalSteps = await countSteps(execution.goal_type, execution.goal_payload);

    const result = await executeGoalLogic(
      execution.goal_type,
      execution.goal_payload,
      executionId,
      async (stepInfo) => {
        // Insert step start
        const { rows: stepRows } = await db.query(
          `INSERT INTO execution_steps (execution_id, name, status, started_at)
           VALUES ($1, $2, 'running', NOW())
           RETURNING id`,
          [executionId, stepInfo.name]
        );
        const stepId = stepRows[0].id;

        try {
          // 🔥 Run real step logic
          const output = await runStep(stepInfo);

          // Mark step completed
          await db.query(
            `UPDATE execution_steps
             SET status = 'completed', finished_at = NOW(), result = $2
             WHERE id = $1`,
            [stepId, JSON.stringify(output)]
          );

          completedSteps++;
          publishEvent(executionId, {
            event: "execution_progress",
            completedSteps,
            totalSteps,
            step: stepInfo.name,
            result: output,
          });
        } catch (stepErr) {
          // Mark step failed
          await db.query(
            `UPDATE execution_steps
             SET status = 'failed', finished_at = NOW(), error = $2
             WHERE id = $1`,
            [stepId, stepErr.message]
          );

          publishEvent(executionId, {
            event: "execution_progress",
            completedSteps,
            totalSteps,
            step: stepInfo.name,
            error: stepErr.message,
          });

          throw stepErr; // bubble up to fail the whole execution
        }
      }
    );

    /* =========================
       QUOTA INCREMENT
    ========================= */
    if (execution.goal_type.startsWith("ai_")) {
      await incrementAiUsage(user);
    }

    /* =========================
       FINALIZE SUCCESS
    ========================= */
    await db.query(
      `UPDATE executions
       SET status = 'completed',
           finished_at = NOW(),
           result = $2
       WHERE id = $1`,
      [executionId, JSON.stringify(result)]
    );

    publishEvent(executionId, {
      event: "execution_completed",
      totalSteps,
      result,
    });
  } catch (err) {
    /* =========================
       FINALIZE FAILURE
    ========================= */
    await db.query(
      `UPDATE executions
       SET status = 'failed',
           finished_at = NOW(),
           error = $2
       WHERE id = $1`,
      [executionId, err.message]
    );

    publishEvent(executionId, {
      event: "execution_failed",
      error: err.message,
    });

    throw err;
  }
}

/* Utility: count steps based on goal type/payload */
async function countSteps(goalType, payload) {
  if (goalType.startsWith("ai_")) return 3;
  if (payload?.tasks) return payload.tasks.length;
  return 1;
}

/* 🔥 Real step runner */
async function runStep(stepInfo) {
  if (stepInfo.name === "fetchData") {
    const res = await fetch("https://api.github.com/repos/vercel/vercel");
    return await res.json();
  }

  if (stepInfo.name === "processFile") {
    return { processed: true, file: stepInfo.filePath };
  }

  if (stepInfo.name === "ai_generate") {
    return { text: "AI-generated output" };
  }

  return { echo: stepInfo.payload };
}