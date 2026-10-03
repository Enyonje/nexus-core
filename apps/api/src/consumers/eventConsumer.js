import { db } from "../db/db.js";
import { handleGoalCreated } from "./handlers/goalCreated.js";
import { handleExecutionCreated } from "./handlers/executionCreated.js";
import { handleExecutionFailed } from "./handlers/executionFailed.js";

const handlers = {
  GOAL_CREATED: handleGoalCreated,
  EXECUTION_CREATED: handleExecutionCreated,
  EXECUTION_FAILED: handleExecutionFailed
};

export async function consumeEvents(limit = 10) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: events } = await client.query(
      `
      SELECT *
      FROM events
      WHERE processed_at IS NULL
      ORDER BY created_at
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [limit]
    );

    for (const event of events) {
      const handler = handlers[event.type];

      if (handler) {
        await handler(event, client);
      }

      await client.query(
        `UPDATE events SET processed_at = now() WHERE id = $1`,
        [event.id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
