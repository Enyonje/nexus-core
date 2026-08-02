// src/events/publish.js
import { emitEvent, broadcastEvent, publishEvent as notifyEvent } from "./stream.js";
import { db } from "../db/db.js";

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
  "sentinel_summary",   // ✅ summary events for unified trace

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
      id: payload.id || crypto.randomUUID(),
      ts: Date.now(),
      ...payload,
      time: new Date().toISOString(),
    };

    // Log for audit
    console.log("📣 Event:", enriched.executionId || "-", enriched.event);

    // 🔥 Emit to specific execution stream
    if (enriched.executionId) {
      emitEvent(enriched.executionId, enriched);
    } else {
      // 🔥 Broadcast to all clients if no executionId
      broadcastEvent(enriched);
    }

    // 🔥 Forward to Postgres NOTIFY channel
    await notifyEvent(enriched);

  } catch (err) {
    console.error("❌ Event publish failed:", err.message);
  }
}

/**
 * Publish audit log entry via Postgres NOTIFY
 */
export async function publishAudit(executionId, status, meta = {}) {
  try {
    const payload = {
      executionId,
      event: "audit_log",
      status,
      meta,
      ts: Date.now(),
    };

    // 🔥 Emit locally
    if (executionId) {
      emitEvent(executionId, payload);
    } else {
      broadcastEvent(payload);
    }

    // 🔥 Forward to Postgres NOTIFY channel
    await notifyEvent(payload);

    console.log("📝 Audit:", executionId, status);
  } catch (err) {
    console.error("❌ Audit publish failed:", err.message);
  }
}
