import { db } from "../db/db.js";

/**
 * Simple DB-backed event subscription
 * Polls event_bus table
 */
export function subscribe(eventType, handler) {
  setInterval(async () => {
    const { rows } = await db.query(
      `
      SELECT id, payload
      FROM event_bus
      WHERE type = $1
        AND status = 'pending'
      ORDER BY created_at
      LIMIT 5
      `,
      [eventType]
    );

    for (const event of rows) {
      try {
        await handler({ payload: event.payload });

        await db.query(
          `
          UPDATE event_bus
          SET status = 'completed'
          WHERE id = $1
          `,
          [event.id]
        );
      } catch (err) {
        console.error("Event failed", event.id, err);

        await db.query(
          `
          UPDATE event_bus
          SET status = 'failed'
          WHERE id = $1
          `,
          [event.id]
        );
      }
    }
  }, 1000);
}