// Provider request/response adapters for outbound SupportOps messages.
// Secrets are supplied by the caller from the encrypted channel configuration;
// this module never reads or persists credentials itself.

export class OutboundError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = "OutboundError";
        this.code = code;
        this.statusCode = statusCode;
    }
}

const text = (value) => typeof value === "string" ? value.trim() : "";
const json = (value) => JSON.stringify(value);

export function buildRequest(channel, payload = {}) {
    const recipient = text(payload.to);
    const body = text(payload.body);
    const secrets = payload.secrets ?? {};
    const config = payload.config ?? {};

    if (channel === "voice") {
        throw new OutboundError("NO_OUTBOUND", "Outbound voice calls are not supported by this adapter.");
    }
    if (!["whatsapp", "messenger", "social", "sms", "email"].includes(channel)) {
        throw new OutboundError("UNKNOWN_CHANNEL", `Unsupported outbound channel: ${channel}`);
    }
    if (!recipient) throw new OutboundError("NO_RECIPIENT", "A recipient is required.");
    if (!body) throw new OutboundError("EMPTY_MESSAGE", "Message content is required.");

    if (channel === "whatsapp") {
        const token = text(secrets.accessToken);
        const phoneNumberId = text(config.phoneNumberId);
        if (!token || !phoneNumberId) throw new OutboundError("CHANNEL_NOT_CONFIGURED", "WhatsApp credentials are incomplete.", 503);
        return {
            url: `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneNumberId)}/messages`,
            init: {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: json({ messaging_product: "whatsapp", to: recipient, type: "text", text: { body, preview_url: false } }),
            },
        };
    }

    if (channel === "social" || channel === "messenger") {
        const token = text(secrets.pageAccessToken || secrets.accessToken);
        if (!token) throw new OutboundError("CHANNEL_NOT_CONFIGURED", "Social messaging credentials are incomplete.", 503);
        return {
            url: "https://graph.facebook.com/v20.0/me/messages",
            init: {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: json({ recipient: { id: recipient }, messaging_type: "RESPONSE", message: { text: body } }),
            },
        };
    }

    if (channel === "sms") {
        const apiKey = text(secrets.apiKey);
        const username = text(config.username);
        if (!apiKey || !username) throw new OutboundError("CHANNEL_NOT_CONFIGURED", "SMS provider credentials are incomplete.", 503);
        const form = new URLSearchParams({ username, to: recipient, message: body });
        const shortcode = text(config.shortcode);
        if (shortcode) form.set("from", shortcode);
        const sandbox = username.toLowerCase() === "sandbox";
        return {
            url: `https://api.${sandbox ? "sandbox." : ""}africastalking.com/version1/messaging`,
            init: {
                method: "POST",
                headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
                body: form.toString(),
            },
        };
    }

    const subjectInput = text(payload.subject) || "Support response";
    const subject = /^re\s*:/i.test(subjectInput) ? subjectInput : `Re: ${subjectInput}`;
    const from = text(config.supportAddress) || "support@nexusthecore.com";
    return {
        url: "https://api.postmarkapp.com/email",
        init: {
            method: "POST",
            headers: { "X-Postmark-Server-Token": text(secrets.postmarkToken), "Content-Type": "application/json", Accept: "application/json" },
            body: json({ From: from, To: recipient, Subject: subject, TextBody: body, MessageStream: "outbound" }),
        },
    };
}

export function interpret(channel, status, data) {
    if (!data || typeof data !== "object" || status < 200 || status >= 300) {
        const message = text(data?.error?.message || data?.Message || data?.message) || `Provider request failed (${status}).`;
        return { ok: false, error: message };
    }

    if (channel === "whatsapp") {
        const id = data.messages?.[0]?.id;
        return id ? { ok: true, id } : { ok: false, error: "Provider did not return a message ID." };
    }
    if (channel === "social" || channel === "messenger") {
        const id = data.message_id;
        return id ? { ok: true, id } : { ok: false, error: "Provider did not return a message ID." };
    }
    if (channel === "sms") {
        const recipient = data.SMSMessageData?.Recipients?.[0];
        if (recipient?.statusCode === 101 || recipient?.status === "Success") {
            return recipient.messageId ? { ok: true, id: recipient.messageId } : { ok: true, id: null };
        }
        return { ok: false, error: text(recipient?.status) || "SMS provider rejected the message." };
    }
    if (channel === "email") {
        return data.ErrorCode === 0 && data.MessageID
            ? { ok: true, id: data.MessageID }
            : { ok: false, error: text(data.Message) || "Email provider rejected the message." };
    }
    return { ok: false, error: "Unsupported outbound channel." };
}

export function needsWindow(channel) {
    return ["whatsapp", "messenger", "social"].includes(channel);
}

export function windowOpen(lastMessageAt, now = new Date()) {
    if (!lastMessageAt) return false;
    const timestamp = new Date(lastMessageAt).getTime();
    if (!Number.isFinite(timestamp)) return false;
    const elapsed = now.getTime() - timestamp;
    return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
}

/** Fastify status route plugin. */
export default async function outboundRoutes(fastify) {
    fastify.get("/status", async (_request, reply) =>
        reply.send({ success: true, message: "Outbound service active" })
    );
}
