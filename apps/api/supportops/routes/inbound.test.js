import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
    verifyMetaSignature,
    verifyTwilioSignature,
    verifySharedSecret,
    verifyPostmarkAuth,
    normalize,
} from "./inbound.js";

test("Meta webhook signature accepts only the matching raw-body HMAC", () => {
    const body = Buffer.from(JSON.stringify({ entry: [{ id: "123" }] }));
    const secret = "meta-test-secret";
    const signature = `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
    assert.equal(verifyMetaSignature(body, signature, secret), true);
    assert.equal(verifyMetaSignature(body, signature, "wrong-secret"), false);
    assert.equal(verifyMetaSignature(body, null, secret), false);
});

test("Twilio webhook signature validates the canonical URL and sorted form fields", () => {
    const url = "https://supportops-ai.onrender.com/api/v1/supportops/tickets/channels/webhook/voice/token";
    const params = { CallSid: "CA123", From: "+254700000000", Direction: "inbound" };
    const data = Object.keys(params).sort().reduce((value, key) => value + key + params[key], url);
    const signature = crypto.createHmac("sha1", "twilio-secret").update(data, "utf8").digest("base64");
    assert.equal(verifyTwilioSignature(url, params, signature, "twilio-secret"), true);
    assert.equal(verifyTwilioSignature(url, params, signature, "wrong-secret"), false);
});

test("shared-secret and Postmark Basic/custom-header authentication fail closed", () => {
    assert.equal(verifySharedSecret("known", "known"), true);
    assert.equal(verifySharedSecret("known", "other"), false);
    assert.equal(verifySharedSecret(undefined, "known"), false);
    assert.equal(verifyPostmarkAuth({ "x-postmark-server-token": "postmark-secret" }, "postmark-secret"), true);
    const basic = Buffer.from("postmark-user:postmark-secret").toString("base64");
    assert.equal(verifyPostmarkAuth({ authorization: `Basic ${basic}` }, "postmark-secret"), true);
    assert.equal(verifyPostmarkAuth({}, "postmark-secret"), false);
});

test("WhatsApp payload normalizes to tenant-ready inbound message fields", () => {
    const messages = normalize("whatsapp", {
        entry: [{ changes: [{ value: {
            contacts: [{ wa_id: "254700000000", profile: { name: "Customer" } }],
            messages: [{ id: "wamid.123", from: "254700000000", type: "text", text: { body: "Help" } }],
        } }] }],
    });
    assert.deepEqual(messages, [{
        externalId: "wamid.123",
        customerId: "254700000000",
        customer: "Customer",
        subject: "Help",
        body: "Help",
    }]);
});
