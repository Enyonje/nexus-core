// src/routes/executionStream.js
import fastifyCors from "@fastify/cors";
import EventEmitter from "events";

// ✅ Create a shared emitter for events
export const executionEmitter = new EventEmitter();

export default async function executionStreamRoutes(app) {
    // Enable CORS for your frontend domain
    await app.register(fastifyCors, {
        origin: "https://nexusthecore.com",
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true
    });

    // SSE endpoint
    app.get("/api/executions/:id/stream", async (req, reply) => {
        reply
            .header("Content-Type", "text/event-stream")
            .header("Cache-Control", "no-cache")
            .header("Connection", "keep-alive")
            .header("Access-Control-Allow-Origin", "https://nexusthecore.com")
            .send();

        const executionId = req.params.id;

        // Heartbeat every 10s
        const interval = setInterval(() => {
            reply.raw.write(`event: heartbeat\n`);
            reply.raw.write(`data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
        }, 10000);

        // Listen for events published for this execution
        const listener = (event) => {
            reply.raw.write(`event: ${event.event}\n`);
            reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        executionEmitter.on(`execution:${executionId}`, listener);

        req.raw.on("close", () => {
            clearInterval(interval);
            executionEmitter.removeListener(`execution:${executionId}`, listener);
        });
    });
}
