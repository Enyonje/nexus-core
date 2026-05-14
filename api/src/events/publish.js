// src/events/publish.js
import { emitEvent, broadcastEvent } from "./stream.js";

/**
 * Central event publisher
 * This must NEVER crash the server
 */
const ALLOWED_EVENTS = new Set([
  // executions
  "execution_started",
  "execution_progress",
  "execution_completed",
  "execution_failed",
  "execution_warning",
  "execution_heartbeat",

  // sentinel
  "sentinel_blocked",

  // goals
  "goal_created",
  "goal_updated",

  // subscriptions
  "subscription_upgraded",
  "subscription_downgraded",

  // admin
  "admin_override",
]);

export async function publishEvent(payload) {
  if (!payload?.event) {
    console.warn("⚠️ Event missing 'event' field:", payload);
    return;
  }

  if (!ALLOWED_EVENTS.has(payload.event)) {
    console.warn(`⚠️ Event blocked: ${payload.event}`);
    return; // 🔑 DO NOT THROW
  }

  try {
    const enriched = {
      ...payload,
      time: new Date().toISOString(),
    };

    // Log for audit
    console.log("📣 Event:", enriched.executionId, enriched.event);

    // 🔥 Emit to specific execution stream
    if (enriched.executionId) {
      emitEvent(enriched.executionId, enriched);
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
