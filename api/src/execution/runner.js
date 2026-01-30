import { db } from "../db/db.js";
import { executeStep } from "./stepExecutor.js";
import { withRetry } from "./retry.js";
import { publishEvent } from "../events/publish.js";

const SYSTEM_IDENTITY = { sub: "nexus-core", role: "service" };

export async function runExecution(executionId) {
  // Mark execution as running
  await db.query(
    `UPDATE executions SET status = 'RUNNING', started_at = now() WHERE id = $1`,
    [executionId]
  );

  await publishEvent(db, SYSTEM_IDENTITY, "execution_started", { executionId });

  const { rows: steps } = await db.query(
    `SELECT * FROM execution_steps
     WHERE execution_id = $1
     ORDER BY position ASC`,
    [executionId]
  );

  try {
    for (const step of steps) {
      await withRetry(
        () => executeStep(step),
        { retries: step.retry_count ?? 2 }
      );

      // Optional: publish progress after each step
      await publishEvent(db, SYSTEM_IDENTITY, "execution_progress", {
        executionId,
        stepId: step.id,
        position: step.position,
        status: "completed",
      });
    }

    // Mark execution as completed
    await db.query(
      `UPDATE executions SET status = 'COMPLETED', finished_at = now() WHERE id = $1`,
      [executionId]
    );

    await publishEvent(db, SYSTEM_IDENTITY, "execution_completed", { executionId });
  } catch (err) {
    // Mark execution as failed
    await db.query(
      `UPDATE executions SET status = 'FAILED', error = $2, finished_at = now() WHERE id = $1`,
      [executionId, err.message]
    );

    await publishEvent(db, SYSTEM_IDENTITY, "execution_failed", {
      executionId,
      error: err.message,
    });
  }
}