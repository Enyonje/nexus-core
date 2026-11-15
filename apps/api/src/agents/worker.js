import { db } from "../db/db.js";
import { classifyFailure, computeBackoff } from "./failure.js";
import { publishEvent } from "../routes/executions.js";
import { runSentinel } from "../agents/sentinel.js";

const MAX_ATTEMPTS = 5;

/**
 * Worker executes the next pending/failed step in real time.
 */
export async function runNextStep(executionId) {
  const client = await db.connect();

  try {
    const stepRes = await client.query(
      `
      SELECT * FROM execution_steps
      WHERE execution_id = $1
        AND status IN ('pending', 'failed')
        AND (next_retry_at IS NULL OR next_retry_at <= now())
      ORDER BY step_index
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `,
      [executionId]
    );

    if (stepRes.rowCount === 0) return null;
    const step = stepRes.rows[0];

    if (step.attempt_count >= MAX_ATTEMPTS) {
      await client.query(
        `UPDATE execution_steps SET status = 'failed' WHERE id = $1`,
        [step.id]
      );
      publishEvent(executionId, {
        event: "execution_progress",
        stepId: step.id,
        step: step.name,
        status: "failed",
        reason: "Max attempts reached",
      });
      return null;
    }

    await client.query(
      `UPDATE execution_steps SET status = 'running' WHERE id = $1`,
      [step.id]
    );
    publishEvent(executionId, {
      event: "execution_progress",
      stepId: step.id,
      step: step.name,
      status: "running",
    });

    let output;
    let error = null;

    try {
      // 🔥 Real step execution
      output = await runStep(step);

      // Mark completed
      await client.query(
        `UPDATE execution_steps
         SET status = 'completed', finished_at = NOW(), output = $2
         WHERE id = $1`,
        [step.id, JSON.stringify(output)]
      );

      publishEvent(executionId, {
        event: "execution_progress",
        stepId: step.id,
        step: step.name,
        status: "completed",
        result: output,
      });

      // 🔎 Sentinel validation
      const verdict = await runSentinel(executionId);
      if (!verdict) {
        publishEvent(executionId, {
          event: "sentinel_blocked",
          stepId: step.id,
          reason: "Governance agent rejected output",
        });
        throw new Error("Sentinel blocked execution");
      }
    } catch (err) {
      error = err;
    }

    if (error) {
      const failureType = classifyFailure(error);
      const nextRetry = computeBackoff(step.attempt_count);

      await client.query(
        `
        UPDATE execution_steps
        SET status = 'failed',
            attempt_count = attempt_count + 1,
            last_error = $2,
            next_retry_at = $3
        WHERE id = $1
        `,
        [step.id, error.message, nextRetry]
      );

      publishEvent(executionId, {
        event: "execution_progress",
        stepId: step.id,
        step: step.name,
        status: "failed",
        error: error.message,
        retryAt: nextRetry,
        failureType,
      });

      return step;
    }

    return step;
  } finally {
    client.release();
  }
}

/* 🔥 Real step runner */
async function runStep(step) {
  switch (step.step_type) {
    case "FETCH_DATA": {
      const res = await fetch(step.payload.url);
      return await res.json();
    }
    case "PROCESS_FILE": {
      return { processed: true, file: step.payload.filePath };
    }
    case "AI_GENERATE": {
      // Example: call your AI logic
      return { text: "AI-generated output" };
    }
    default:
      return { echo: step.payload };
  }
}