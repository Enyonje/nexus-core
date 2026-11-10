import test from "node:test";
import assert from "node:assert/strict";
import { parseSseFrames, consumeSseResponse } from "../../ui/src/supportops/src/lib/sse.js";

test("SSE parser handles comments, CRLF, split frames and JSON payloads", () => {
    const events = [];
    let rest = parseSseFrames(': connected\r\ndata: {"type":"ticket",', (e) => events.push(e));
    assert.deepEqual(events, []);
    rest = parseSseFrames(rest + '"number":42}\r\n\r\n: ping\r\n\r\n', (e) => events.push(e));
    assert.equal(rest, "");
    assert.equal(events.length, 1);
    assert.deepEqual(events[0].data, { type: "ticket", number: 42 });
});

test("SSE parser joins multi-line data and preserves event name", () => {
    const events = [];
    parseSseFrames("event: update\ndata: first\ndata: second\n\n", (e) => events.push(e));
    assert.equal(events[0].type, "update");
    assert.equal(events[0].data, "first\nsecond");
});

test("SSE consumer validates response and consumes stream chunks", async () => {
    const events = [];
    const encoder = new TextEncoder();
    const response = {
        ok: true,
        status: 200,
        headers: { get: () => "text/event-stream; charset=utf-8" },
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode('data: {"type":"stream_ready"}\n'));
                controller.enqueue(encoder.encode('\ndata: {"type":"ticket"}\n\n'));
                controller.close();
            },
        }),
    };
    await consumeSseResponse(response, (e) => events.push(e), new AbortController().signal);
    assert.deepEqual(events.map((e) => e.data.type), ["stream_ready", "ticket"]);
});

test("SSE consumer rejects non-stream HTTP responses", async () => {
    await assert.rejects(
        consumeSseResponse({ ok: false, status: 503 }, () => {}, new AbortController().signal),
        (error) => error.status === 503
    );
});
