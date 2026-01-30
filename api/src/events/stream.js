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

  reply.raw.write("\n");

  if (!clients.has(executionId)) {
    clients.set(executionId, new Set());
  }

  clients.get(executionId).add(reply);

  reply.raw.on("close", () => {
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

  // Always enrich payload with event + executionId
  const enriched = {
    event: payload.event,
    executionId,
    ...payload,
  };

  for (const reply of listeners) {
    reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
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
      reply.raw.write(`data: ${JSON.stringify(enriched)}\n\n`);
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