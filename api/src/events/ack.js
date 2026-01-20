import { db } from "../db/db.js";

export async function acknowledgeEvent(eventId, success) {
  await db.query(
    `
    UPDATE events
    SET status = $1
    WHERE id = $2
    `,
    [success ? "completed" : "failed", eventId]
  );
}
