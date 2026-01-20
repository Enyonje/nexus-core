import { db } from "../db/db.js";

/**
 * Sentinel Governance Agent
 * Validates completed execution steps
 */
export async function runSentinel(executionId) {
  const { rows: steps } = await db.query(
    `
    SELECT id, step_type, output
    FROM execution_steps
    WHERE execution_id = $1
      AND status = 'completed'
    `,
    [executionId]
  );

  for (const step of steps) {
    const verdict = validateStep(step);

    if (!verdict.ok) {
      // Mark step as failed
      await db.query(
        `
        UPDATE execution_steps
        SET status = 'failed',
            error = $1
        WHERE id = $2
        `,
        [verdict.reason, step.id]
      );

      // Fail execution
      await db.query(
        `
        UPDATE executions
        SET status = 'failed',
            finished_at = NOW()
        WHERE id = $1
        `,
        [executionId]
      );

      console.error("Sentinel blocked execution", executionId, verdict.reason);
      return false;
    }
  }

  return true;
}

/**
 * Rule-based validation (V1)
 * Replace later with LLM-based reasoning
 */
function validateStep(step) {
  if (!step.output) {
    return {
      ok: false,
      reason: "Missing output (possible hallucination)",
    };
  }

  if (JSON.stringify(step.output).length < 10) {
    return {
      ok: false,
      reason: "Output too small to be valid",
    };
  }

  if (step.step_type === "API_CALL") {
    if (!step.output.result?.includes("successful")) {
      return {
        ok: false,
        reason: "API call did not return success",
      };
    }
  }

  return { ok: true };
}
