// events/stream.js
import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";

// Local map of executionId -> Set of SSE reply objects
const clients = new Map();

// Redis connection options (TLS for rediss://)
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

// Handle incoming events from Redis and broadcast locally
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
  const origin = reply.request?.headers?.origin;
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  // Reject if origin not allowed
  if (origin && !allowedOrigins.includes(origin)) {
    reply.code(403).send({ error: "Origin not allowed" });
    return;
  }

  // Explicit CORS headers for SSE
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
  });

  // Flush headers immediately
  if (typeof reply.raw.flushHeaders === "function") {
    reply.raw.flushHeaders();
  }

  // Initial ping
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
 * Publish event to Redis
 */
export function publishEvent(payload) {
  try {
    redisPublisher.publish("stream-events", JSON.stringify(payload));
  } catch (err) {
    console.error("Redis publish failed:", err);
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
