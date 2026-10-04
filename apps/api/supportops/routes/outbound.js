// apps/api/supportops/routes/outbound.js

export class OutboundError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = "OutboundError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

export function buildRequest(channel, payload) {
    // outbound request builder logic
}

export function interpret(channel, status, data) {
    // provider interpretation logic
}

export function needsWindow(channel) {
    return ["whatsapp", "messenger"].includes(channel);
}

export function windowOpen(lastMessageAt) {
    if (!lastMessageAt) return false;
    const elapsed = Date.now() - new Date(lastMessageAt).getTime();
    return elapsed < 24 * 60 * 60 * 1000;
}

/**
 * Fastify Route Plugin for Outbound Operations
 */
export default async function outboundRoutes(fastify, options) {
    fastify.get("/status", async (request, reply) => {
        return reply.send({ success: true, message: "Outbound service active" });
    });
}