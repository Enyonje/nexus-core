import test from "node:test";
import assert from "node:assert/strict";
import { slaDueAt, priorityFor, canAppend, SLA_MINUTES } from "./ticketRules.js";

test("SLA due time follows priority and defaults to normal", () => {
    const t0 = new Date("2026-10-04T10:00:00Z");
    assert.equal(slaDueAt("urgent", t0).toISOString(), "2026-10-04T10:15:00.000Z");
    assert.equal(slaDueAt("low", t0).toISOString(), "2026-10-05T10:00:00.000Z");
    assert.equal(slaDueAt("???", t0).getTime() - t0.getTime(), SLA_MINUTES.normal * 60000);
});

test("Priority rules", () => {
    assert.equal(priorityFor({ channel: "email", text: "Unauthorized charge on my card" }), "urgent");
    assert.equal(priorityFor({ channel: "web", text: "I was charged twice" }), "high");
    assert.equal(priorityFor({ channel: "voice", text: "Voicemail" }), "high");
    assert.equal(priorityFor({ channel: "sms", text: "Where is my order?" }), "normal");
    assert.equal(priorityFor({ channel: "sms" }), "normal");
});

test("Threading: open and pending append, closed never, solved only inside the window", () => {
    const now = new Date("2026-10-04T10:00:00Z");
    assert.equal(canAppend(null, now), false);
    assert.equal(canAppend({ status: "open" }, now), true);
    assert.equal(canAppend({ status: "pending" }, now), true);
    assert.equal(canAppend({ status: "closed" }, now), false);
    assert.equal(canAppend({ status: "solved", resolved_at: "2026-10-03T10:00:00Z" }, now), true);
    assert.equal(canAppend({ status: "solved", resolved_at: "2026-09-30T10:00:00Z" }, now), false);
    assert.equal(canAppend({ status: "solved", resolved_at: null }, now), false);
});