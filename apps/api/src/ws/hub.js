const executionSockets = new Map();
/**
 * executionSockets = {
 *   executionId: Set<WebSocket>
 * }
 */

export function addSocket(executionId, socket) {
  if (!executionSockets.has(executionId)) {
    executionSockets.set(executionId, new Set());
  }
  executionSockets.get(executionId).add(socket);
}

export function removeSocket(executionId, socket) {
  const set = executionSockets.get(executionId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) {
    executionSockets.delete(executionId);
  }
}

export function broadcast(executionId, payload) {
  const sockets = executionSockets.get(executionId);
  if (!sockets) return;

  const message = JSON.stringify(payload);

  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}
