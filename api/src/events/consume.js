// apps/api/src/events/consume.js
import { db } from "../db/db.js";
import { publishEvent } from "./publish.js";

/**
 * Consume the next pending event and lock it for this worker.
 * Returns the event object if found, null otherwise.
 */
export async function consumeNextEvent(workerId) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT *
      FROM events
      WHERE status = 'pending'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }

    const event = result.rows[0];

    await client.query(
      `
      UPDATE events
      SET status = 'processing',
          locked_by = $1,
          locked_at = now(),
          attempts = attempts + 1
      WHERE id = $2
      `,
      [workerId, event.id]
    );

    await client.query("COMMIT");

    // 🔥 Immediately publish to SSE bus
    publishEvent(event.execution_id, {
      event: event.type,
      payload: event.payload,
      workerId,
      status: "processing",
    });

    return event;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Event consume failed:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Mark event as completed
 */
export async function completeEvent(eventId, result) {
  await db.query(
    `
    UPDATE events
    SET status = 'completed',
        finished_at = now(),
        result = $2
    WHERE id = $1
    `,
    [eventId, JSON.stringify(result)]
  );

  publishEvent(null, {
    event: "event.completed",
    eventId,
    result,
  });
}

/**
 * Mark event as failed
 */
export async function failEvent(eventId, error) {
  await db.query(
    `
    UPDATE events
    SET status = 'failed',
        finished_at = now(),
        last_error = $2
    WHERE id = $1
    `,
    [eventId, error.message]
  );

  publishEvent(null, {
    event: "event.failed",
    eventId,
    error: error.message,
  });
}