import test from "node:test";
import assert from "node:assert/strict";
import { buildRequest, interpret, windowOpen, needsWindow, OutboundError } from "./outbound.js";

test("24-hour window", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    assert.equal(windowOpen("2026-10-03T13:00:00Z", now), true);   // 23h ago
    assert.equal(windowOpen("2026-10-03T11:00:00Z", now), false);  // 25h ago
    assert.equal(windowOpen(null, now), false);
    assert.deepEqual(["whatsapp", "social", "sms", "email", "web"].map(needsWindow), [true, true, false, false, false]);
});

test("WhatsApp and Messenger requests", () => {
    const wa = buildRequest("whatsapp", { secrets: { accessToken: "TOK" }, config: { phoneNumberId: "555" }, to: "254700111222", body: "Hi" });
    assert.equal(wa.url, "https://graph.facebook.com/v20.0/555/messages");
    assert.equal(wa.init.headers.Authorization, "Bearer TOK");
    assert.deepEqual(JSON.parse(wa.init.body), { messaging_product: "whatsapp", to: "254700111222", type: "text", text: { body: "Hi", preview_url: false } });
    const fb = buildRequest("social", { secrets: { pageAccessToken: "PT" }, to: "99", body: "Yo" });
    assert.equal(JSON.parse(fb.init.body).recipient.id, "99");
    assert.equal(JSON.parse(fb.init.body).messaging_type, "RESPONSE");
});

test("SMS: sandbox vs live host, shortcode, form encoding", () => {
    const live = buildRequest("sms", { secrets: { apiKey: "K" }, config: { username: "acme", shortcode: "20880" }, to: "+254711000111", body: "Hello there" });
    assert.equal(live.url, "https://api.africastalking.com/version1/messaging");
    assert.equal(live.init.headers.apiKey, "K");
    const form = new URLSearchParams(live.init.body);
    assert.equal(form.get("to"), "+254711000111");
    assert.equal(form.get("from"), "20880");
    assert.equal(buildRequest("sms", { secrets: { apiKey: "K" }, config: { username: "sandbox" }, to: "+1", body: "x" }).url, "https://api.sandbox.africastalking.com/version1/messaging");
});

test("Email: subject gets one Re: and uses the support address", () => {
    const a = buildRequest("email", { secrets: { postmarkToken: "PM" }, config: { supportAddress: "support@acme.com" }, to: "joy@x.com", body: "Done", subject: "Reset help" });
    assert.equal(JSON.parse(a.init.body).Subject, "Re: Reset help");
    assert.equal(JSON.parse(a.init.body).From, "support@acme.com");
    const b = buildRequest("email", { secrets: {}, config: {}, to: "joy@x.com", body: "x", subject: "RE: Reset help" });
    assert.equal(JSON.parse(b.init.body).Subject, "RE: Reset help");
});

test("Voice, unknown channels and missing recipients are refused", () => {
    assert.throws(() => buildRequest("voice", { to: "+1", body: "x" }), (e) => e instanceof OutboundError && e.code === "NO_OUTBOUND");
    assert.throws(() => buildRequest("pigeon", { to: "1", body: "x" }), OutboundError);
    assert.throws(() => buildRequest("sms", { to: "", body: "x" }), (e) => e.code === "NO_RECIPIENT");
});

test("Provider answers: success and failure for every channel", () => {
    assert.deepEqual(interpret("whatsapp", 200, { messages: [{ id: "wamid.1" }] }), { ok: true, id: "wamid.1" });
    assert.equal(interpret("whatsapp", 400, { error: { message: "Re-engagement message" } }).ok, false);
    assert.deepEqual(interpret("social", 200, { recipient_id: "1", message_id: "m_1" }), { ok: true, id: "m_1" });
    assert.equal(interpret("social", 200, {}).ok, false);
    assert.deepEqual(interpret("sms", 201, { SMSMessageData: { Recipients: [{ statusCode: 101, status: "Success", messageId: "ATXid_1" }] } }), { ok: true, id: "ATXid_1" });
    const bad = interpret("sms", 201, { SMSMessageData: { Recipients: [{ status: "InvalidPhoneNumber" }] } });
    assert.deepEqual(bad, { ok: false, error: "InvalidPhoneNumber" });
    assert.deepEqual(interpret("email", 200, { ErrorCode: 0, MessageID: "pm-1" }), { ok: true, id: "pm-1" });
    assert.deepEqual(interpret("email", 422, { ErrorCode: 300, Message: "Invalid email request" }), { ok: false, error: "Invalid email request" });
    assert.equal(interpret("whatsapp", 200, null ?? undefined).ok, false);
});