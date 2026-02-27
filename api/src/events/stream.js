// events/stream.js
import Redis from "ioredis";

// Local map of executionId -> Set of SSE reply objects
const clients = new Map();

// Redis connections
const redisOptions = {};
if (process.env.REDIS_URL?.startsWith("rediss://")) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redisPublisher = new Redis(process.env.REDIS_URL, redisOptions);
const redisSubscriber = new Redis(process.env.REDIS_URL, redisOptions);

// Subscribe to the "stream-events" channel
redisSubscriber.subscribe("stream-events", (err) => {
  if (err) {
    console.error("Redis subscription failed:", err);
  } else {
    console.log("Subscribed to stream-events channel");
  }
});

// When a message arrives from Redis, broadcast to local clients
redisSubscriber.on("message", (channel, message) => {
  if (channel !== "stream-events") return;
  try {
    const payload = JSON.parse(message);
    if (payload.executionId) {
      emitEvent(payload.executionId, payload);
    } else {
      broadcastEvent(payload);
    }
  } catch (err) {
    console.error("Failed to parse Redis message:", err);
  }
});

/**
 * Register SSE client for a given executionId
 */
export function registerClient(executionId, reply) {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Initial ping so client knows stream is alive
  reply.raw.write(":\n\n");

  if (!clients.has(executionId)) {
    clients.set(executionId, new Set());
  }
  clients.get(executionId).add(reply);

  // Heartbeat every 15s
  const interval = setInterval(() => {
    try {
      reply.raw.write(":\n\n");
    } catch {
      clearInterval(interval);
    }
  }, 15000);

  reply.raw.on("close", () => {
    clearInterval(interval);
    clients.get(executionId)?.delete(reply);
    if (clients.get(executionId)?.size === 0) {
      clients.delete(executionId);
    }
  });
}

/**
 * Emit event to all listeners for a specific execution (local only)
 */
export function emitEvent(executionId, payload) {
  const listeners = clients.get(executionId);
  if (!listeners) return;

  const enriched = {
    event: payload.event,
    executionId,
    ...payload,
  };

  for (const reply of listeners) {
    try {
      reply.raw.write(`event: ${payload.event}\n`);
      reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
    } catch (err) {
      console.warn("SSE write failed:", err.message);
    }
  }
}

/**
 * Broadcast event to all connected clients across all executions (local only)
 */
export function broadcastEvent(payload) {
  for (const [executionId, listeners] of clients.entries()) {
    const enriched = {
      event: payload.event,
      executionId,
      ...payload,
    };

    for (const reply of listeners) {
      try {
        reply.raw.write(`event: ${payload.event}\n`);
        reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
      } catch (err) {
        console.warn("SSE broadcast failed:", err.message);
      }
    }
  }
}

/**
 * Publish event to Redis so all nodes can broadcast
 */
export function publishEvent(payload) {
  redisPublisher.publish("stream-events", JSON.stringify(payload));
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