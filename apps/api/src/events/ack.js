import { db } from "../db/db.js";
import { publishEvent } from "./publish.js";
import { computeBackoff } from "../agents/failure.js";

/**
 * Acknowledge an event as completed or failed.
 * Updates DB, timestamps, retries if needed, and publishes SSE notification.
 */
export async function acknowledgeEvent(eventId, success, error = null) {
  try {
    if (success) {
      await db.query(
        `
        UPDATE events
        SET status = 'completed',
            finished_at = NOW()
        WHERE id = $1
        `,
        [eventId]
      );

      publishEvent({
        event: "execution_completed", // ✅ matches allowed events
        executionId: null,            // no specific execution stream
        eventId,
        status: "completed",
      });
    } else {
      // Fetch current attempts
      const { rows } = await db.query(
        `SELECT attempts FROM events WHERE id = $1`,
        [eventId]
      );
      const attempts = rows.length ? rows[0].attempts : 0;

      if (attempts < 5) {
        // Retry with backoff
        const nextRetryAt = computeBackoff(attempts);
        await db.query(
          `
          UPDATE events
          SET status = 'pending',
              last_error = $2,
              attempts = attempts + 1,
              next_retry_at = $3
          WHERE id = $1
          `,
          [eventId, error || "Unknown error", nextRetryAt]
        );

        publishEvent({
          event: "execution_warning", // ✅ use warning for retry
          executionId: null,
          eventId,
          status: "pending",
          attempts: attempts + 1,
          retryAt: nextRetryAt,
          error: error || "Unknown error",
        });
      } else {
        // Max attempts reached → permanent failure
        await db.query(
          `
          UPDATE events
          SET status = 'failed',
              finished_at = NOW(),
              last_error = $2
          WHERE id = $1
          `,
          [eventId, error || "Unknown error"]
        );

        publishEvent({
          event: "execution_failed", // ✅ matches allowed events
          executionId: null,
          eventId,
          status: "failed",
          error: error || "Unknown error",
        });
      }
    }
  } catch (err) {
    console.error("❌ Failed to acknowledge event:", err.message);
    // Never throw — acknowledgement must not crash the server
  }
}
