import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { publishEvent } from "../routes/executions.js"; // SSE bus
import { runSentinel } from "../agents/sentinel.js"; // governance agent

/**
 * Run an execution with real-time step publishing and Sentinel validation
 */
export async function runExecution(executionId, payloadOverride = null) {
  const { rows } = await db.query(
    `SELECT e.id, e.goal_id, e.user_id, e.org_id,
            g.goal_type, g.goal_payload
     FROM executions e
     JOIN goals g ON g.id = e.goal_id
     WHERE e.id = $1`,
    [executionId]
  );

  if (!rows.length) throw new Error("Execution not found");
  const execution = rows[0];

  // ✅ Merge override payload if provided
  let payload = payloadOverride
    ? { ...execution.goal_payload, ...payloadOverride }
    : execution.goal_payload;

  // ✅ Validate payload before running
  if (!payload || !payload.text) {
    throw new Error("Missing analysis data: payload.text is required");
  }
  if (!payload.parameters) {
    payload.parameters = { threshold: 0.75, mode: "fast" }; // sensible defaults
  }

  try {
    // Mark execution as running
    await db.query(
      `UPDATE executions SET status = 'running', started_at = NOW() WHERE id = $1`,
      [executionId]
    );
    publishEvent(executionId, {
      event: "execution_started",
      goalType: execution.goal_type,
    });

    let completedSteps = 0;

    // Execute goal logic step-by-step
    const result = await executeGoalLogic(
      execution.goal_type,
      payload,
      executionId,
      async (stepInfo) => {
        const { rows: stepRows } = await db.query(
          `INSERT INTO execution_steps (execution_id, user_id, org_id, name, status, started_at)
           VALUES ($1, $2, $3, $4, 'running', NOW())
           RETURNING id`,
          [executionId, execution.user_id, execution.org_id, stepInfo.name]
        );
        const stepId = stepRows[0].id;

        try {
          const output = await runStep(stepInfo);

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

          // Sentinel validation
          const verdict = await runSentinel(executionId, stepInfo, output);
          if (!verdict?.allowed) {
            publishEvent(executionId, {
              event: "sentinel_blocked",
              stepId,
              reason: verdict?.reason || "Governance agent rejected output",
            });
            throw new Error("Sentinel blocked execution");
          }
        } catch (err) {
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
  switch (stepInfo.name) {
    case "fetchData": {
      const res = await fetch("https://api.github.com/repos/vercel/vercel");
      return await res.json();
    }
    case "processFile":
      return { processed: true, file: stepInfo.filePath };
    case "ai_generate":
      return { text: "AI-generated output" };
    default:
      return { echo: stepInfo.payload };
  }
}