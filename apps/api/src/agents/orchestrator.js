import { runNextStep } from "./worker.js";
import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";

export async function runExecutionLoop(executionId) {
  let keepRunning = true;

  while (keepRunning) {
    const step = await runNextStep(executionId);

    if (!step) {
      // Check if execution is finished
      const { rows } = await db.query(
        `SELECT status FROM executions WHERE id = $1`,
        [executionId]
      );

      if (!rows.length) {
        keepRunning = false;
        break;
      }

      const status = rows[0].status;
      if (["completed", "failed"].includes(status)) {
        keepRunning = false;
        publishEvent(executionId, {
          event: "execution_finalized",
          status,
        });
      } else {
        // Sleep briefly before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}