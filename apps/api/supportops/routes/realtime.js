// backend/routes/realtime.js
// Live connections shared by chat and tickets.
// Single server instance only; use Redis pub/sub when you scale out.

export const visitors = new Map(); // conversationId -> Set(reply)
export const staff = new Map();    // orgId -> Set(reply)

export function openStream(reply, bucket, id) {
    const headers = {
        ...reply.getHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    };
    reply.hijack();
    reply.raw.writeHead(200, headers);
    reply.raw.write(": connected\n\n");

    const set = bucket.get(id) ?? bucket.set(id, new Set()).get(id);
    set.add(reply);

    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 25000);

    reply.raw.on("close", () => {
        clearInterval(ping);
        set.delete(reply);
        if (!set.size) bucket.delete(id);
    });
}

export const push = (bucket, id, event) => {
    for (const r of bucket.get(id) ?? [])
        r.raw.write(`data: ${JSON.stringify(event)}\n\n`);
};

/* ---------- default export ---------- */
export default {
    visitors,
    staff,
    openStream,
    push,
};
