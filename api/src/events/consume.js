import { db } from "../db/db.js";
import { publishEvent } from "./publish.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Persist an audit log entry for an event.
 */
async function persistAuditLog(executionId, status, meta = {}) {
  if (!executionId) return;
  await db.query(
    `INSERT INTO execution_audit (id, execution_id, status, meta, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [uuidv4(), executionId, status, JSON.stringify(meta)]
  );
}

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

    // Persist audit log for processing
    await persistAuditLog(event.execution_id, "processing", {
      eventId: event.id,
      workerId,
      payload: event.payload,
    });

    // 🔥 Immediately publish to SSE bus
    publishEvent({
      executionId: event.execution_id,
      event: "execution_progress",
      eventId: event.id,
      payload: event.payload,
      workerId,
      status: "processing",
      trace: `Worker ${workerId} picked up event ${event.id}`,
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

  // Fetch executionId for this event
  const { rows } = await db.query(`SELECT execution_id FROM events WHERE id = $1`, [eventId]);
  const executionId = rows[0]?.execution_id || null;

  // Persist audit log
  await persistAuditLog(executionId, "completed", result);

  publishEvent({
    executionId,
    event: "execution_completed",
    eventId,
    result,
    trace: `Event ${eventId} completed successfully`,
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

  // Fetch executionId for this event
  const { rows } = await db.query(`SELECT execution_id FROM events WHERE id = $1`, [eventId]);
  const executionId = rows[0]?.execution_id || null;

  // Persist audit log
  await persistAuditLog(executionId, "failed", { error: error.message });

  publishEvent({
    executionId,
    event: "execution_failed",
    eventId,
    error: error.message,
    trace: `Event ${eventId} failed: ${error.message}`,
  });
}