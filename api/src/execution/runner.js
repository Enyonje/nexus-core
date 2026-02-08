import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { publishEvent } from "../routes/executions.js"; // SSE bus
import { runSentinel } from "../agents/sentinel.js"; // now includes LLM reasoning

/**
 * Run an execution with real-time step validation
 */
export async function runExecution(executionId) {
  const { rows } = await db.query(
    `SELECT e.id, e.goal_id, g.goal_type, g.goal_payload, u.id AS user_id
     FROM executions e
     JOIN goals g ON g.id = e.goal_id
     JOIN users u ON u.id = g.user_id
     WHERE e.id = $1`,
    [executionId]
  );

  if (!rows.length) throw new Error("Execution not found");
  const execution = rows[0];

  try {
    // Mark execution as running
    await db.query(
      `UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`,
      [executionId]
    );
    publishEvent(executionId, { event: "execution_started", goalType: execution.goal_type });

    let completedSteps = 0;

    // Execute goal logic step-by-step
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
          // Run actual step logic
          const output = await runStep(stepInfo);

          // Mark step completed
          await db.query(
            `UPDATE execution_steps
             SET status = 'completed', finished_at = NOW(), output = $2
             WHERE id = $1`,
            [stepId, JSON.stringify(output)]
          );

          completedSteps++;
          publishEvent(executionId, {
            event: "execution_progress",
            stepId,
            step: stepInfo.name,
            result: output,
            completedSteps,
          });

          // 🔎 Sentinel validation immediately after step completion
          const verdict = await runSentinel(executionId);
          if (!verdict) {
            publishEvent(executionId, {
              event: "sentinel_blocked",
              stepId,
              reason: "Governance agent rejected output",
            });
            throw new Error("Sentinel blocked execution");
          }
        } catch (err) {
          // Mark step failed
          await db.query(
            `UPDATE execution_steps
             SET status = 'failed', finished_at = NOW(), error = $2
             WHERE id = $1`,
            [stepId, err.message]
          );

          publishEvent(executionId, {
            event: "execution_progress",
            stepId,
            step: stepInfo.name,
            error: err.message,
          });

          throw err;
        }
      }
    );

    // Finalize success
    await db.query(
      `UPDATE executions
       SET status = 'completed', finished_at = NOW(), result = $2
       WHERE id = $1`,
      [executionId, JSON.stringify(result)]
    );
    publishEvent(executionId, { event: "execution_completed", result });
  } catch (err) {
    // Finalize failure
    await db.query(
      `UPDATE executions
       SET status = 'failed', finished_at = NOW(), error = $2
       WHERE id = $1`,
      [executionId, err.message]
    );
    publishEvent(executionId, { event: "execution_failed", error: err.message });
    throw err;
  }
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