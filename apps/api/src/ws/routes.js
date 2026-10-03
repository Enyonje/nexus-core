import { addSocket, removeSocket } from "./hub.js";

export async function registerWsRoutes(fastify) {
  fastify.get("/ws/executions/:executionId", { websocket: true }, (conn, req) => {
    const { executionId } = req.params;

    addSocket(executionId, conn.socket);

    conn.socket.on("close", () => {
      removeSocket(executionId, conn.socket);
    });
  });
}
