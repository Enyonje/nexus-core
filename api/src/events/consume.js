// apps/api/src/events/consume.js
import { db } from "../db/db.js";  // ✅ relative path, not "src/..."

// Consume the next pending event and lock it for this worker
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
    return event;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}