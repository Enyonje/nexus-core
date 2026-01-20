import { db } from "../db/db.js";
import { classifyFailure, computeBackoff } from "./failure.js";

const MAX_ATTEMPTS = 5;

export async function runNextStep(executionId) {
  const client = await db.connect();

  try {
    const stepRes = await client.query(
      `
      SELECT *
      FROM execution_steps
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
        `UPDATE execution_steps
         SET status = 'failed'
         WHERE id = $1`,
        [step.id]
      );
      return null;
    }

    await client.query(
      `UPDATE execution_steps
       SET status = 'running'
       WHERE id = $1`,
      [step.id]
    );

    let output;
    let error = null;

    try {
      // Simulated worker execution
      output = { success: true };
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

      return step;
    }

    await client.query(
      `UPDATE execution_steps
       SET status = 'completed'
       WHERE id = $1`,
      [step.id]
    );

    return step;
  } finally {
    client.release();
  }
}
