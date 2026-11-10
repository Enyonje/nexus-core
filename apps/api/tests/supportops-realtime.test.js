import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { openStream, push, staff } from "../supportops/routes/realtime.js";

function fakeReply() {
    const raw = new EventEmitter();
    raw.destroyed = false;
    raw.writableEnded = false;
    raw.frames = [];
    raw.writeHead = (status, headers) => { raw.status = status; raw.headers = headers; };
    raw.write = (frame) => { raw.frames.push(frame); return true; };
    raw.destroy = () => { raw.destroyed = true; raw.emit("close"); };
    return { raw, request: { headers: { origin: "https://nexusthecore.com" } }, hijack() {} };
}

test("SupportOps SSE stream sends ready frame and scoped ticket events", () => {
    const reply = fakeReply();
    const orgId = `test-${Date.now()}-${Math.random()}`;
    openStream(reply, staff, orgId);

    assert.equal(reply.raw.status, 200);
    assert.equal(reply.raw.headers["Content-Type"], "text/event-stream; charset=utf-8");
    assert.equal(reply.raw.headers["Access-Control-Allow-Origin"], "https://nexusthecore.com");
    assert.equal(reply.raw.headers["Access-Control-Allow-Credentials"], "true");
    assert.match(reply.raw.frames.join(""), /"type":"stream_ready"/);

    const delivered = push(staff, orgId, { type: "ticket", event: "ticket_created", ticket: { number: 1001 } });
    assert.equal(delivered, 1);
    assert.match(reply.raw.frames.join(""), /"ticket_created"/);

    reply.raw.emit("close");
    assert.equal(staff.has(orgId), false);
});


test("realtime readiness explicitly reports single-instance fallback without Redis", async () => {
    const previous = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
        const { initializeRealtime, getRealtimeStatus } = await import("../supportops/routes/realtime.js");
        const status = await initializeRealtime();
        assert.equal(status.mode, "single-instance");
        assert.equal(status.distributed, false);
        assert.equal(getRealtimeStatus().publisherReady, false);
    } finally {
        if (previous === undefined) delete process.env.REDIS_URL;
        else process.env.REDIS_URL = previous;
    }
});
