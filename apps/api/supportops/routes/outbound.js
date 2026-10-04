// backend/routes/outbound.js
// Pure outbound helpers: build each provider's request and read its answer.
// No network or database here, so it can be unit tested.

export const WINDOW_MS = 24 * 60 * 60 * 1000;
// WhatsApp and Messenger/Instagram only allow free-form replies within 24h of the customer's last message
export const needsWindow = (channel) =>
    channel === "whatsapp" || channel === "social";

export const windowOpen = (lastInboundAt, now = new Date()) =>
    Boolean(lastInboundAt) && now - new Date(lastInboundAt) <= WINDOW_MS;

export class OutboundError extends Error {
    constructor(code, message, status = 400) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const json = (headers, payload) => ({
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
});

// -> { url, init } ready for fetch()
export function buildRequest(channel, { secrets = {}, config = {}, to, body, subject = "" }) {
    if (!to) throw new OutboundError("NO_RECIPIENT", "This customer has no address to reply to", 422);
    switch (channel) {
        case "whatsapp":
            return {
                url: `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`,
                init: json(
                    { Authorization: `Bearer ${secrets.accessToken}` },
                    {
                        messaging_product: "whatsapp",
                        to,
                        type: "text",
                        text: { body, preview_url: false },
                    }
                ),
            };
        case "social":
            return {
                url: "https://graph.facebook.com/v20.0/me/messages",
                init: json(
                    { Authorization: `Bearer ${secrets.pageAccessToken}` },
                    {
                        recipient: { id: to },
                        messaging_type: "RESPONSE",
                        message: { text: body },
                    }
                ),
            };
        case "sms": {
            const sandbox = config.username === "sandbox";
            return {
                url: `https://api.${sandbox ? "sandbox." : ""}africastalking.com/version1/messaging`,
                init: {
                    method: "POST",
                    headers: {
                        apiKey: secrets.apiKey,
                        Accept: "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: new URLSearchParams({
                        username: config.username,
                        to,
                        message: body,
                        ...(config.shortcode ? { from: config.shortcode } : {}),
                    }).toString(),
                },
            };
        }
        case "email":
            return {
                url: "https://api.postmarkapp.com/email",
                init: json(
                    {
                        "X-Postmark-Server-Token": secrets.postmarkToken,
                        Accept: "application/json",
                    },
                    {
                        From: config.supportAddress,
                        To: to,
                        TextBody: body,
                        MessageStream: "outbound",
                        Subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`,
                    }
                ),
            };
        case "voice":
            throw new OutboundError(
                "NO_OUTBOUND",
                "Calls can't be answered in writing. Call the customer back.",
                422
            );
        default:
            throw new OutboundError(
                "NO_OUTBOUND",
                `Replies are not supported for ${channel}`,
                422
            );
    }
}

// -> { ok, id?, error? }
export function interpret(channel, status, data = {}) {
    const http = status >= 200 && status < 300;
    switch (channel) {
        case "whatsapp": {
            const id = data.messages?.[0]?.id;
            return http && id ? { ok: true, id } : { ok: false, error: data.error?.message };
        }
        case "social":
            return http && data.message_id
                ? { ok: true, id: data.message_id }
                : { ok: false, error: data.error?.message };
        case "sms": {
            const r = data.SMSMessageData?.Recipients?.[0];
            return http && r?.status === "Success"
                ? { ok: true, id: r.messageId }
                : { ok: false, error: r?.status ?? data.SMSMessageData?.Message };
        }
        case "email":
            return http && data.ErrorCode === 0
                ? { ok: true, id: data.MessageID }
                : { ok: false, error: data.Message };
        default:
            return { ok: false, error: "Unsupported channel" };
    }
}

/* ---------- default export ---------- */
export default {
    WINDOW_MS,
    needsWindow,
    windowOpen,
    OutboundError,
    buildRequest,
    interpret,
};
