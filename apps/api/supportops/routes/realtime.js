// backend/routes/realtime.js
// Live connections shared by chat, tickets, and agent activity streams.
// Redis Pub/Sub fans out events across instances; in-memory delivery is a single-instance fallback.

export const visitors = new Map(); // conversationId -> Set(reply)
export const staff = new Map();    // orgId -> Set(reply)
export const activityStreamClients = new Set(); // Global agent activity stream listeners

const REDIS_CHANNEL = "nexus:supportops:realtime:v1";
let redisPublisher = null;
let redisSubscriber = null;
let realtimeMode = "single-instance";

const bucketKey = (bucket) => bucket === staff ? "staff" : bucket === visitors ? "visitors" : null;
const bucketFor = (key) => key === "staff" ? staff : key === "visitors" ? visitors : null;

function deliverLocal(bucket, id, event) {
    const clients = bucket.get(id);
    if (!clients?.size) return 0;
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    let delivered = 0;
    for (const reply of [...clients]) {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
            clients.delete(reply);
            continue;
        }
        try {
            reply.raw.write(frame);
            delivered += 1;
        } catch {
            clients.delete(reply);
            reply.raw.destroy?.();
        }
    }
    if (!clients.size) bucket.delete(id);
    return delivered;
}

/**
 * Configure Redis Pub/Sub so ticket and chat events reach connected clients
 * regardless of which API instance received the inbound webhook or mutation.
 * If REDIS_URL is absent, the service explicitly runs in single-instance mode.
 */
export async function initializeRealtime() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        realtimeMode = "single-instance";
        console.warn("[SupportOps realtime] REDIS_URL is not configured; streams are single-instance only.");
        return getRealtimeStatus();
    }

    const Redis = (await import("ioredis")).default;
    const publisher = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 10_000),
    });
    const subscriber = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 10_000),
    });

    publisher.on("error", (error) => console.error("[SupportOps realtime] Redis publisher error:", error.message));
    subscriber.on("error", (error) => console.error("[SupportOps realtime] Redis subscriber error:", error.message));

    try {
        await Promise.all([publisher.connect(), subscriber.connect()]);
        await subscriber.subscribe(REDIS_CHANNEL);
        subscriber.on("message", (channel, raw) => {
            if (channel !== REDIS_CHANNEL) return;
            try {
                const message = JSON.parse(raw);
                const bucket = bucketFor(message.bucket);
                if (bucket && typeof message.id === "string" && message.event) {
                    deliverLocal(bucket, message.id, message.event);
                }
            } catch (error) {
                console.error("[SupportOps realtime] Invalid Redis event:", error.message);
            }
        });
        redisPublisher = publisher;
        redisSubscriber = subscriber;
        realtimeMode = "redis";
    } catch (error) {
        publisher.disconnect();
        subscriber.disconnect();
        realtimeMode = "degraded";
        throw new Error(`SupportOps Redis realtime initialization failed: ${error.message}`);
    }

    return getRealtimeStatus();
}

export function getRealtimeStatus() {
    const redisReady = Boolean(
        redisPublisher?.status === "ready" &&
        redisSubscriber?.status === "ready"
    );
    return {
        mode: redisReady ? "redis" : realtimeMode,
        distributed: redisReady,
        publisherReady: redisPublisher?.status === "ready",
        subscriberReady: redisSubscriber?.status === "ready",
    };
}

export async function closeRealtime() {
    const clients = [redisPublisher, redisSubscriber].filter(Boolean);
    redisPublisher = null;
    redisSubscriber = null;
    await Promise.allSettled(clients.map((client) => client.quit()));
    realtimeMode = "single-instance";
}

export function openStream(reply, bucket, id) {
    const origin = reply.request?.headers?.origin;
    const headers = {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Vary": "Origin",
    };

    // The caller has already enforced its own origin policy:
    // - staff streams pass through the API CORS allow-list;
    // - widget streams pass through the channel's allowedDomain check.
    // Reflect only that validated origin; never combine wildcard CORS with credentials.
    if (origin) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Credentials"] = "true";
    }

    reply.hijack();
    reply.raw.writeHead(200, headers);
    reply.raw.write("retry: 3000\n");
    reply.raw.write(`data: ${JSON.stringify({ type: "stream_ready", connectedAt: new Date().toISOString() })}\n\n`);

    const set = bucket.get(id) ?? bucket.set(id, new Set()).get(id);
    set.add(reply);

    let closed = false;
    const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        set.delete(reply);
        if (!set.size) bucket.delete(id);
    };

    const ping = setInterval(() => {
        if (reply.raw.destroyed || reply.raw.writableEnded) {
            cleanup();
            return;
        }
        try {
            reply.raw.write(`: ping ${Date.now()}\n\n`);
        } catch {
            cleanup();
            reply.raw.destroy?.();
        }
    }, 20_000);
    ping.unref?.();

    reply.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
}

export const push = (bucket, id, event) => {
    const key = bucketKey(bucket);
    if (key && getRealtimeStatus().distributed) {
        const payload = JSON.stringify({ bucket: key, id: String(id), event });
        redisPublisher.publish(REDIS_CHANNEL, payload).catch((error) => {
            console.error("[SupportOps realtime] Redis publish failed; delivering locally:", error.message);
            deliverLocal(bucket, id, event);
        });
        return 0; // Subscribers, including this instance, perform the local fan-out.
    }
    return deliverLocal(bucket, id, event);
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