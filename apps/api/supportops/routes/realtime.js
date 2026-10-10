// backend/routes/realtime.js
// Live connections shared by chat, tickets, and agent activity streams.
// Single server instance only; use Redis pub/sub when you scale out.

export const visitors = new Map(); // conversationId -> Set(reply)
export const staff = new Map();    // orgId -> Set(reply)
export const activityStreamClients = new Set(); // Global agent activity stream listeners

export function openStream(reply, bucket, id) {
    const origin = reply.request?.headers?.origin;
    const allowedOrigins = [
        "https://nexusthecore.com",
        "https://nexus-core-chi.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ];

    const headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // CRITICAL for Render / Nginx / Cloudflare
        "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Org-Id",
    };

    reply.hijack();
    reply.raw.writeHead(200, headers);
    reply.raw.write(": connected\n\n");

    const set = bucket.get(id) ?? bucket.set(id, new Set()).get(id);
    set.add(reply);

    const ping = setInterval(() => {
        try {
            reply.raw.write(": ping\n\n");
        } catch {
            clearInterval(ping);
        }
    }, 25000);

    reply.raw.on("close", () => {
        clearInterval(ping);
        set.delete(reply);
        if (!set.size) bucket.delete(id);
    });
}

export const push = (bucket, id, event) => {
    for (const r of bucket.get(id) ?? []) {
        try {
            r.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
            // Dead socket cleanup handled by close event
        }
    }
};

/**
 * Broadcast event to all global activity stream listeners
 */
export const pushGlobalActivity = (event) => {
    for (const r of activityStreamClients) {
        try {
            r.raw.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
            activityStreamClients.delete(r);
        }
    }
};

/**
 * Fastify Plugin to register real-time SSE routes
 */
export async function realtimeRoutes(server) {
    // Global Agent Activity Stream matching /api/v1/agents/activity/stream (or via prefix /api/v1/stream)
    server.get("/agents/activity/stream", async (req, reply) => {
        const origin = req.headers.origin;
        const allowedOrigins = [
            "https://nexusthecore.com",
            "https://nexus-core-chi.vercel.app",
            "http://localhost:5173",
            "http://localhost:3000",
        ];

        const headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Org-Id",
        };

        reply.hijack();
        reply.raw.writeHead(200, headers);
        reply.raw.write(
            `data: ${JSON.stringify({
                event: "nexus_connected",
                description: "Global activity stream synchronized.",
                data: { system: "Nexus Core Stream", status: "Active" },
            })}\n\n`
        );

        activityStreamClients.add(reply);

        const ping = setInterval(() => {
            try {
                reply.raw.write(": ping\n\n");
            } catch {
                clearInterval(ping);
            }
        }, 25000);

        reply.raw.on("close", () => {
            clearInterval(ping);
            activityStreamClients.delete(reply);
        });
    });
}

export default realtimeRoutes;