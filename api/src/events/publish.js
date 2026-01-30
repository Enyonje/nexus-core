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

export async function publishEvent(event) {
  if (!event?.type) {
    console.warn("⚠️ Event missing type:", event);
    return;
  }

  if (!ALLOWED_EVENTS.has(event.type)) {
    console.warn(`⚠️ Event blocked: ${event.type}`);
    return; // 🔑 DO NOT THROW
  }

  try {
    // for now we just log — later this can push to Redis / WS / Kafka
    console.log("📣 Event:", {
      type: event.type,
      payload: event.payload || {},
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Event publish failed:", err.message);
  }
}
