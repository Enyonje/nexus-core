import { registerClient } from "../events/stream.js";

export async function streamRoutes(server) {
  server.get("/stream/:executionId", async (req, reply) => {
    const { executionId } = req.params;
    registerClient(Number(executionId), reply);
  });
}
