// src/events/stream.js
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/db.js"; // Postgres pool/connection

// Local map of executionId -> Set of SSE reply objects
const clients = new Map();

/**
 * Register SSE client for a given executionId
 */
export function registerClient(executionId, reply) {
  const origin = reply.request?.headers?.origin;
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    reply.code(403).send({ error: "Origin not allowed" });
    return;
  }

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
  });

  reply.raw.flushHeaders?.();

  // Initial handshake
  reply.raw.write(`event: connected\n`);
  reply.raw.write(
    `data: ${JSON.stringify({ executionId, status: "connected" })}\n\n`
  );

  if (!clients.has(executionId)) {
    clients.set(executionId, new Set());
  }
  clients.get(executionId).add(reply);

  // Heartbeat every 15s
  const interval = setInterval(() => {
    try {
      reply.raw.write(":\n\n"); // comment line keeps connection alive
    } catch {
      clearInterval(interval);
    }
  }, 15000);

  reply.raw.on("close", () => {
    clearInterval(interval);
    const listeners = clients.get(executionId);
    if (listeners) {
      listeners.delete(reply);
      if (listeners.size === 0) {
        clients.delete(executionId);
      }
    }
  });
}

/**
 * Emit event to all listeners for a specific execution
 */
export function emitEvent(executionId, payload) {
  const listeners = clients.get(executionId);
  if (!listeners) return;

  const enriched = {
    id: uuidv4(),
    ts: Date.now(),
    event: payload.event || "message",
    executionId,
    ...payload,
  };

  for (const reply of listeners) {
    try {
      reply.raw.write(`event: ${enriched.event}\n`);
      reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
    } catch (err) {
      console.warn("SSE write failed:", err.message);
    }
  }
}

/**
 * Broadcast event to all connected clients
 */
export function broadcastEvent(payload) {
  for (const [executionId, listeners] of clients.entries()) {
    const enriched = {
      id: uuidv4(),
      ts: Date.now(),
      event: payload.event || "message",
      executionId,
      ...payload,
    };

    for (const reply of listeners) {
      try {
        reply.raw.write(`event: ${enriched.event}\n`);
        reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
      } catch (err) {
        console.warn("SSE broadcast failed:", err.message);
      }
    }
  }
}

/**
 * Publish event via Postgres NOTIFY
 */
export async function publishEvent(payload) {
  try {
    const message = JSON.stringify(payload).replace(/'/g, "''");
    await db.query(`NOTIFY execution_events, '${message}'`);
  } catch (err) {
    console.error("Postgres NOTIFY failed:", err);
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
    const message = JSON.stringify(payload).replace(/'/g, "''");
    await db.query(`NOTIFY execution_events, '${message}'`);

    await db.query(
      `INSERT INTO execution_audit (id, execution_id, status, meta, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [uuidv4(), executionId, status, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error("Postgres NOTIFY audit failed:", err);
  }
}

/**
 * Get active streams summary
 */
export function getActiveStreams() {
  const summary = {};
  for (const [executionId, listeners] of clients.entries()) {
    summary[executionId] = listeners.size;
  }
  return summary;
}

/**
 * Subscribe to Postgres notifications
 */
(async () => {
  const client = await db.connect();
  await client.query("LISTEN execution_events");

  client.on("notification", (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      if (payload.executionId) {
        emitEvent(payload.executionId, payload);
      } else {
        broadcastEvent(payload);
      }
    } catch (err) {
      console.error("Failed to parse NOTIFY payload:", err);
    }
  });
})();
