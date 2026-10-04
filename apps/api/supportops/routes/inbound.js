// backend/routes/inbound.js
// Pure inbound helpers (no database, no framework) so they can be unit tested.

import crypto from "node:crypto";

const same = (a, b) =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const clip = (s, n = 80) => String(s ?? "").trim().slice(0, n);

/* ---------- signature checks ---------- */

// Meta (WhatsApp, Messenger, Instagram): X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(rawBody, appSecret)
export function verifyMetaSignature(rawBody, header, appSecret) {
    if (!rawBody || !header || !appSecret) return false;
    const expected =
        "sha256=" +
        crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return same(String(header), expected);
}

// Twilio: X-Twilio-Signature = base64(HMAC-SHA1(authToken, url + sorted(key+value)))
export function verifyTwilioSignature(url, params, header, authToken) {
    if (!header || !authToken || !url) return false;
    const data = Object.keys(params ?? {})
        .sort()
        .reduce((s, k) => s + k + params[k], url);
    const expected = crypto
        .createHmac("sha1", authToken)
        .update(data, "utf8")
        .digest("base64");
    return same(String(header), expected);
}

/* ---------- payload -> normalized messages ---------- */

function whatsapp(p) {
    const out = [];
    for (const e of p?.entry ?? [])
        for (const c of e.changes ?? []) {
            const v = c.value ?? {};
            const names = Object.fromEntries(
                (v.contacts ?? []).map((x) => [x.wa_id, x.profile?.name])
            );
            for (const m of v.messages ?? []) {
                const body = m.text?.body ?? "";
                out.push({
                    externalId: m.id,
                    customerId: m.from,
                    customer: names[m.from] ?? m.from,
                    subject: clip(body || `[${m.type}]`),
                    body,
                });
            }
        }
    return out;
}

function social(p) {
    const label = p?.object === "instagram" ? "Instagram" : "Messenger";
    const out = [];
    for (const e of p?.entry ?? [])
        for (const m of e.messaging ?? []) {
            if (!m.message || m.message.is_echo) continue;
            const body = m.message.text ?? "";
            out.push({
                externalId: m.message.mid,
                customerId: m.sender?.id,
                customer: `${label} user ${m.sender?.id}`,
                subject: clip(body || "[attachment]"),
                body,
            });
        }
    return out;
}

function sms(p) {
    if (!p?.from || !p?.text) return [];
    return [
        {
            externalId: p.id ?? p.linkId,
            customerId: p.from,
            customer: p.from,
            subject: clip(p.text),
            body: p.text,
        },
    ];
}

function email(p) {
    const raw = p?.From ?? p?.from;
    if (!raw) return [];
    const addr = String(raw).match(/<([^>]+)>/)?.[1] ?? String(raw);
    return [
        {
            externalId: p.MessageID ?? p.messageId,
            customerId: addr.toLowerCase(),
            customer: p.FromName || p.name || addr,
            subject: clip(p.Subject ?? p.subject ?? "(no subject)"),
            body: p.TextBody ?? p.text ?? "",
        },
    ];
}

function voice(p) {
    if (!p?.CallSid || !String(p.Direction ?? "").startsWith("inbound")) return [];
    const missed = ["no-answer", "busy", "failed"].includes(p.CallStatus);
    if (!p.RecordingUrl && !missed) return [];
    const vm = Boolean(p.RecordingUrl);
    return [
        {
            externalId: vm ? `${p.CallSid}:vm` : p.CallSid,
            customerId: p.From,
            customer: p.From,
            subject: clip(vm ? `Voicemail from ${p.From}` : `Missed call from ${p.From}`),
            body: vm ? `Voicemail: ${p.RecordingUrl}` : `Missed call (${p.CallStatus})`,
        },
    ];
}

const NORMALIZERS = { whatsapp, social, sms, email, voice };

export const normalize = (key, payload) =>
    NORMALIZERS[key] ? NORMALIZERS[key](payload) : [];

/* ---------- default export ---------- */
export default {
    verifyMetaSignature,
    verifyTwilioSignature,
    normalize,
};
