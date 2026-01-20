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
  });
}

/**
 * Emit event to all listeners
 */
export function emitEvent(executionId, payload) {
  const listeners = clients.get(executionId);
  if (!listeners) return;

  for (const reply of listeners) {
    reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
