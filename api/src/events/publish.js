import { emitEvent, broadcastEvent } from "./stream.js";

/**
 * Central event publisher
 * This must NEVER crash the server
 */
const ALLOWED_EVENTS = new Set([
  // executions
  "execution.started",
  "execution.step.started",
  "execution.step.finished",
  "execution.finished",
  "execution.failed",

  // goals
  "goal.created",
  "goal.updated",

  // subscriptions
  "subscription.upgraded",
  "subscription.downgraded",

  // admin
  "admin.override",
]);

export async function publishEvent(executionId, event) {
  if (!event?.event) {
    console.warn("⚠️ Event missing 'event' field:", event);
    return;
  }

  if (!ALLOWED_EVENTS.has(event.event)) {
    console.warn(`⚠️ Event blocked: ${event.event}`);
    return; // 🔑 DO NOT THROW
  }

  try {
    const enriched = {
      ...event,
      executionId,
      time: new Date().toISOString(),
    };

    // Log for audit
    console.log("📣 Event:", enriched);

    // 🔥 Emit to specific execution stream
    if (executionId) {
      emitEvent(executionId, enriched);
    } else {
      // 🔥 Broadcast to all clients if no executionId
      broadcastEvent(enriched);
    }

    // Optional: forward to external bus (Redis/Kafka/RabbitMQ)
    // await externalBus.publish(enriched);

  } catch (err) {
    console.error("❌ Event publish failed:", err.message);
  }
}