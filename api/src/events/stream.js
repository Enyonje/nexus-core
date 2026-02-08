const clients = new Map();

/**
 * Register SSE client
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

  // Heartbeat every 15s to keep connection alive
  const interval = setInterval(() => {
    try {
      reply.raw.write(":\n\n"); // comment line = SSE heartbeat
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
 * Emit event to all listeners for a specific execution
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
 * Broadcast event to all connected clients across all executions
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
 * Get active streams summary
 */
export function getActiveStreams() {
  const summary = {};
  for (const [executionId, listeners] of clients.entries()) {
    summary[executionId] = listeners.size;
  }
  return summary;
}