import { db } from "../db/db.js";
import { executeGoalLogic } from "./logic.js";
import { publishEvent } from "../routes/executions.js"; // SSE bus
import { runSentinel } from "../agents/sentinel.js"; // governance agent

/**
 * Validate payload before execution starts
 */
function validatePayload(goalType, payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Payload must be an object");
  }

  if (!payload.text || payload.text.trim().length === 0) {
    throw new Error(`Missing or empty payload.text for goal: ${goalType}`);
  }

  // Goal-specific requirements
  switch (goalType) {
    case "processFile":
      if (!payload.filePath) {
        throw new Error("Missing filePath in payload for processFile goal");
      }
      break;
    case "analysis":
      if (payload.text.length < 5) {
        throw new Error("Analysis text too short, must be descriptive");
      }
      break;
    default:
      // Other goals can be more flexible
      break;
  }

  // Sensible defaults
  if (!payload.parameters) {
    payload.parameters = { threshold: 0.75, mode: "fast" };
  }

  return payload;
}

/**
 * Validate and normalize step output before Sentinel checks it.
 */
function validateStepOutput(stepInfo, output) {
  if (!output || typeof output !== "object") {
    return {
      valid: false,
      normalized: { error: "Output missing or invalid" },
      reason: "Output was null or not an object",
    };
  }

  switch (stepInfo.name) {
    case "fetchData":
      if (!output.data) {
        return {
          valid: false,
          normalized: { data: null, error: "No data returned" },
          reason: "fetchData step requires 'data' field",
        };
      }
      break;

    case "processFile":
      if (!output.file) {
        return {
          valid: false,
          normalized: { processed: false, file: "unknown" },
          reason: "processFile step requires 'file' field",
        };
      }
      break;

    case "ai_generate":
      if (!output.text) {
        return {
          valid: false,
          normalized: { text: "AI-generated output (default)" },
          reason: "ai_generate step requires 'text' field",
        };
      }
      break;

    case "analysis":
      if (!output.text) {
        return {
          valid: false,
          normalized: { text: "Default analysis output" },
          reason: "analysis step requires 'text' field",
        };
      }
      break;

    default:
      if (!output.echo) {
        return {
          valid: false,
          normalized: { echo: "no payload provided" },
          reason: "default step requires 'echo' field",
        };
      }
  }

  return { valid: true, normalized: output };
}

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
  payload = validatePayload(execution.goal_type, payload);

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
          const rawOutput = await runStep(stepInfo);
          const { valid, normalized, reason } = validateStepOutput(stepInfo, rawOutput);

          if (!valid) {
            publishEvent(executionId, {
              event: "execution_warning",
              stepId,
              step: stepInfo.name,
              reason,
              normalized,
            });
          }

          await db.query(
            `UPDATE execution_steps
             SET status = 'completed', finished_at = NOW(), output = $2
             WHERE id = $1`,
            [stepId, JSON.stringify(normalized)]
          );

          completedSteps++;
          publishEvent(executionId, {
            event: "execution_progress",
            stepId,
            step: stepInfo.name,
            result: normalized,
            completedSteps,
          });

          // Debug log before Sentinel
          console.log("Sentinel check:", {
            step: stepInfo.name,
            output: normalized,
          });

          // Sentinel validation
          const verdict = await runSentinel(executionId, stepInfo, normalized);
          if (!verdict?.allowed) {
            publishEvent(executionId, {
              event: "sentinel_blocked",
              stepId,
              reason: verdict?.reason || "Governance agent rejected output",
              output: normalized,
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
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      return { data };
    }
    case "processFile":
      return { processed: true, file: stepInfo.filePath || "unknown" };
    case "ai_generate":
      return { text: "AI-generated output" };
    case "analysis":
      return { text: stepInfo.payload?.text || "Default analysis output" };
    default:
      return { echo: stepInfo.payload || "no payload provided" };
  }
}