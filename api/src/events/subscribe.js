import { db } from "../db/db.js";

const subscribers = new Map();

/**
 * Subscribe to a specific event type.
 * Handler is called in real time when Postgres NOTIFY fires.
 */
export async function subscribe(eventType, handler) {
  if (!subscribers.has(eventType)) {
    subscribers.set(eventType, new Set());
  }
  subscribers.get(eventType).add(handler);
}

/**
 * Initialize Postgres LISTEN/NOTIFY for event_bus channel.
 * This should be called once at app startup.
 */
export async function initEventStream() {
  const client = await db.connect();

  client.on("notification", async (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      const { type, id, payload: eventPayload } = payload;

      const handlers = subscribers.get(type);
      if (handlers) {
        for (const handler of handlers) {
          try {
            await handler({ id, payload: eventPayload });

            // Mark event completed
            await db.query(
              `UPDATE event_bus SET status = 'completed' WHERE id = $1`,
              [id]
            );
          } catch (err) {
            console.error("Event handler failed", id, err);
            await db.query(
              `UPDATE event_bus SET status = 'failed', last_error = $2 WHERE id = $1`,
              [id, err.message]
            );
          }
        }
      }
    } catch (err) {
      console.error("❌ Failed to process notification:", err.message);
    }
  });

  await client.query("LISTEN event_channel");
  console.log("✅ Event stream initialized, listening on 'event_channel'");
}

/**
 * Publish event into DB and notify listeners.
 */
export async function publishEvent(type, payload) {
  const { rows } = await db.query(
    `INSERT INTO event_bus (type, payload, status, created_at)
     VALUES ($1, $2, 'pending', NOW())
     RETURNING id`,
    [type, JSON.stringify(payload)]
  );

  const id = rows[0].id;

  // Notify listeners immediately
  await db.query("NOTIFY event_channel, $1", [
    JSON.stringify({ type, id, payload }),
  ]);

  return id;
}