// Admin-managed channel connections + public inbound webhooks.
//
// 1) Add to schema.prisma (and `channels Channel[]` on Organization), then migrate:
//
//   model Channel {
//     id             String       @id @default(uuid())
//     org_id         String
//     key            String                    // whatsapp | voice | sms | email | web | social
//     status         String       @default("connected")
//     config_enc     String                    // AES-256-GCM encrypted credentials
//     public_config  Json         @default("{}")    // non-secret fields shown back to the admin
//     webhook_token  String       @unique           // random, lives in the webhook URL
//     verify_token   String                    // WhatsApp handshake
//     last_event_at  DateTime?
//     created_at     DateTime     @default(now())
//     updated_at     DateTime     @updatedAt
//     org            Organization @relation(fields: [org_id], references: [id], onDelete: Cascade)
//     @@unique([org_id, key])
//     @@map("channels")
//   }
//
//   model InboundEvent {            // idempotency: providers retry, we must not create duplicate tickets
//     id           String   @id @default(uuid())
//     channel_id   String
//     external_id  String
//     created_at   DateTime @default(now())
//     channel      Channel  @relation(fields: [channel_id], references: [id], onDelete: Cascade)
//     @@unique([channel_id, external_id])
//     @@map("inbound_events")
//   }   (and `events InboundEvent[]` on Channel)
//
// 2) Env:  CHANNELS_ENC_KEY=$(openssl rand -base64 32)   PUBLIC_API_URL=https://api.yourdomain.com
// 3) Register: await app.register(channelsRoutes, { prefix: "/api/v1/supportops/tickets/channels" });
import crypto from "node:crypto";
import { prisma } from "../lib/deps.js";
import { guard } from "../security/entitlements.js";
import { createTicketFromInbound } from "./ticketService.js";
import { normalize, verifyMetaSignature, verifyTwilioSignature } from "./inbound.js";

const SECRETS = {
    // Phone Number ID is an identifier, not a secret. Older encrypted
    // configurations remain readable through the compatibility fallback.
    whatsapp: ["accessToken", "appSecret"],
    voice: ["authToken"],
    sms: ["apiKey"],
    email: ["postmarkToken"], // outbound replies via Postmark
    web: [],
    social: ["pageAccessToken", "appSecret"],
};

/* ---------- encryption at rest ---------- */
const KEY = Buffer.from(process.env.CHANNELS_ENC_KEY ?? "", "base64");
const requireEncryptionKey = () => {
    if (KEY.length !== 32) {
        const error = new Error("CHANNELS_ENC_KEY must be a base64-encoded 32-byte key. Configure it before managing channels.");
        error.code = "CHANNELS_ENCRYPTION_NOT_CONFIGURED";
        throw error;
    }
};
const encrypt = (obj) => {
    requireEncryptionKey();
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
    return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};
export const decrypt = (s) => {
    requireEncryptionKey();
    const parts = String(s ?? "").split(".");
    if (parts.length !== 3 || parts.some((part) => !part)) throw new Error("Stored channel credentials have an invalid encrypted format.");
    const [iv, tag, data] = parts.map((x) => Buffer.from(x, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
};
const rand = (n) => crypto.randomBytes(n).toString("hex");

const urlFor = (row) =>
    `${process.env.PUBLIC_API_URL || "https://nexus-core-a0px.onrender.com"}/api/v1/supportops/tickets/channels/webhook/${row.key}/${row.webhook_token}`;

const view = (row, isAdmin) => {
    let savedSecretFields = [];
    try {
        const secrets = row.config_enc ? decrypt(row.config_enc) : {};
        savedSecretFields = (SECRETS[row.key] || []).filter(
            (key) => Boolean(secrets[key])
        );
    } catch {
        savedSecretFields = [];
    }

    return {
        key: row.key,
        connected: row.status === "connected",
        status: row.status,
        configured: Boolean(row.config_enc),
        hasCredentials: savedSecretFields.length > 0,
        savedSecretFields,
        lastEventAt: row.last_event_at,
        publicConfig: row.public_config,
        ...(isAdmin ? { webhookUrl: urlFor(row), verifyToken: row.verify_token } : {}),
    };
};

// Returns false if this provider message was already processed (retry)
async function firstTime(channelId, externalId) {
    if (!externalId || !String(externalId).trim()) {
        throw new Error("INBOUND_EVENT_MISSING_EXTERNAL_ID");
    }
    try {
        await prisma.inboundEvent.create({
            data: {
                channel_id: channelId,
                external_id: String(externalId),
            },
        });
        return true;
    } catch (err) {
        if (err.code === "P2002") return false;
        throw err;
    }
}

export default async function channelsRoutes(app) {
    if (KEY.length !== 32) {
        app.log.error("CHANNELS_ENC_KEY is missing or invalid; channel credential writes are disabled until configured.");
    }

    // Keep the raw body so provider signatures can be verified
    if (app.hasContentTypeParser("application/json")) app.removeContentTypeParser("application/json");
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
        req.rawBody = body;
        try { done(null, JSON.parse(body.toString("utf8") || "{}")); }
        catch (err) { err.statusCode = 400; done(err); }
    });

    // Twilio and Africa's Talking post form-encoded bodies
    if (app.hasContentTypeParser("application/x-www-form-urlencoded")) app.removeContentTypeParser("application/x-www-form-urlencoded");
    app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (req, body, done) =>
        done(null, Object.fromEntries(new URLSearchParams(body)))
    );

    const read = guard({ app: "supportops", roles: ["admin", "management", "agent"] });
    const admin = guard({ app: "supportops", roles: ["admin", "owner"] });
    const where = (req) => ({ org_id_key: { org_id: req.access.org.id, key: req.params.key } });

    /* ---------- admin API ---------- */
    app.get("/", { preHandler: read }, async (req, reply) => {
        try {
            const rows = await prisma.channel.findMany({ where: { org_id: req.access.org.id } });
            const isAdmin = req.access.appRole === "admin" || req.access.role === "admin";
            return rows.map((r) => view(r, isAdmin));
        } catch (err) {
            console.error("Failed to fetch channels:", err);
            return reply.code(500).send({ error: "CHANNELS_FETCH_ERROR", message: err.message });
        }
    });

    app.put("/:key", { preHandler: admin }, async (req, reply) => {
        try {
            if (KEY.length !== 32) {
                return reply.code(503).send({
                    error: "CHANNEL_ENCRYPTION_NOT_CONFIGURED",
                    message: "Set CHANNELS_ENC_KEY to a base64-encoded 32-byte key before saving channel credentials.",
                });
            }
            const { key } = req.params;
            if (!SECRETS[key]) return reply.code(404).send({ message: "Unknown channel" });

            // Channels check feature entitlements if configured
            if (req.access.features && !req.access.features.includes(`channel_${key}`) && !req.access.features.includes("all_channels")) {
                return reply.code(403).send({
                    error: "PLAN_UPGRADE_REQUIRED",
                    feature: `channel_${key}`,
                    message: `The ${key} channel is not included in your current plan tier.`
                });
            }

            const incoming = Object.entries(req.body?.config ?? {}).slice(0, 10);
            const existing = await prisma.channel.findUnique({ where: where(req) });
            const secrets = existing?.config_enc ? decrypt(existing.config_enc) : {};
            // Preserve existing public fields when an edit submits only some fields.
            const pub = { ...(existing?.public_config ?? {}) };

            for (const [k, v] of incoming) {
                if (typeof v !== "string" || v.length > 2000) continue;
                if (SECRETS[key].includes(k)) {
                    if (v.trim()) secrets[k] = v.trim();
                } else {
                    pub[k] = v.trim();
                }
            }

            // Saving credentials is not proof that a provider connection works.
            // Every changed configuration must pass its provider test first.
            const row = await prisma.channel.upsert({
                where: where(req),
                update: {
                    config_enc: encrypt(secrets),
                    public_config: pub,
                    status: "pending",
                    updated_at: new Date()
                },
                create: {
                    org_id: req.access.org.id,
                    key,
                    config_enc: encrypt(secrets),
                    public_config: pub,
                    webhook_token: rand(24),
                    verify_token: rand(16),
                    status: "pending"
                },
            });
            return view(row, true);
        } catch (err) {
            req.log.error({ err }, "Channel update error");
            const status = err.code === "CHANNELS_ENCRYPTION_NOT_CONFIGURED" ? 503 : 500;
            return reply.code(status).send({ error: err.code || "CHANNEL_UPDATE_FAILED", message: err.message });
        }
    });

    app.delete("/:key", { preHandler: admin }, async (req) => {
        await prisma.channel.deleteMany({ where: { org_id: req.access.org.id, key: req.params.key } });
        return { ok: true };
    });

    app.post("/:key/test", { preHandler: admin }, async (req, reply) => {
        const row = await prisma.channel.findUnique({ where: where(req) });
        if (!row) return reply.code(404).send({ ok: false, message: "Save the channel configuration first." });

        const timeout = AbortSignal.timeout(12000);
        const fail = async (message) => {
            await prisma.channel.update({
                where: { id: row.id },
                data: { status: "pending" },
            });
            return { ok: false, status: "pending", message };
        };

        try {
            const secrets = decrypt(row.config_enc);
            const config = row.public_config ?? {};
            let response;
            let message;

            switch (row.key) {
                case "whatsapp": {
                    const phoneId = config.phoneNumberId || secrets.phoneNumberId;
                    if (!phoneId || !secrets.accessToken || !secrets.appSecret)
                        return fail("Phone Number ID, access token and App Secret are required.");

                    response = await fetch(
                        `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}?fields=id,display_phone_number,verified_name`,
                        { headers: { Authorization: `Bearer ${secrets.accessToken}` }, signal: timeout }
                    );
                    message = "WhatsApp Phone Number ID and access token verified.";
                    break;
                }

                case "social": {
                    if (!config.pageId || !secrets.pageAccessToken || !secrets.appSecret)
                        return fail("Page ID, Page Access Token and App Secret are required.");

                    response = await fetch(
                        `https://graph.facebook.com/v20.0/${encodeURIComponent(config.pageId)}?fields=id,name`,
                        { headers: { Authorization: `Bearer ${secrets.pageAccessToken}` }, signal: timeout }
                    );
                    message = "Meta Page credentials verified.";
                    break;
                }

                case "voice": {
                    if (!config.accountSid || !secrets.authToken || !config.phoneNumber)
                        return fail("Account SID, Auth Token and Twilio phone number are required.");

                    response = await fetch(
                        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.accountSid)}.json`,
                        {
                            headers: {
                                Authorization: "Basic " + Buffer.from(`${config.accountSid}:${secrets.authToken}`).toString("base64"),
                            },
                            signal: timeout,
                        }
                    );
                    message = "Twilio account credentials verified.";
                    break;
                }

                case "sms": {
                    if (!config.username || !secrets.apiKey || !config.shortcode)
                        return fail("Africa's Talking username, API key and sender ID/shortcode are required.");

                    response = await fetch(
                        `https://api.africastalking.com/version1/user?username=${encodeURIComponent(config.username)}`,
                        {
                            headers: { apiKey: secrets.apiKey, Accept: "application/json" },
                            signal: timeout,
                        }
                    );
                    message = "Africa's Talking API credentials verified.";
                    break;
                }

                case "email": {
                    if (!config.supportAddress || !secrets.postmarkToken)
                        return fail("Support address and Postmark Server Token are required.");

                    response = await fetch("https://api.postmarkapp.com/server", {
                        headers: {
                            "X-Postmark-Server-Token": secrets.postmarkToken,
                            Accept: "application/json",
                        },
                        signal: timeout,
                    });
                    message = "Postmark server token verified.";
                    break;
                }

                case "web": {
                    let domain = String(config.allowedDomain ?? "").trim().toLowerCase();
                    domain = domain.replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
                    if (!domain || !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/.test(domain))
                        return fail("Enter a valid website domain, for example yourcompany.com.");

                    await prisma.channel.update({
                        where: { id: row.id },
                        data: { public_config: { ...config, allowedDomain: domain }, status: "connected" },
                    });
                    return { ok: true, status: "connected", message: "Web chat is configured. Install the website widget to receive chats." };
                }

                default:
                    return fail("Unsupported channel.");
            }

            if (!response.ok) {
                // Do not return provider response bodies: they may contain sensitive details.
                return fail(`Provider verification failed (HTTP ${response.status}). Check the credentials and account permissions.`);
            }

            const data = await response.json().catch(() => ({}));

            if (row.key === "sms" && data?.UserData?.status && data.UserData.status !== "success") {
                return fail("Africa's Talking did not validate this account. Check the username and API key.");
            }

            await prisma.channel.update({
                where: { id: row.id },
                data: { status: "connected" },
            });

            return { ok: true, status: "connected", message };
        } catch (err) {
            req.log.error({ err, channel: row.key }, "Channel verification failed");
            return fail(err.name === "TimeoutError"
                ? "Provider verification timed out. Try again."
                : "Could not verify the provider connection. Check the credentials and try again.");
        }
    });

    /* ---------- public inbound webhooks ---------- */
    app.get("/webhook/:key/:token", async (req, reply) => {
        const row = await prisma.channel.findFirst({
            where: { key: req.params.key, webhook_token: req.params.token, status: { in: ["pending", "connected"] } },
        });
        const q = req.query ?? {};
        if (row && ["whatsapp", "social"].includes(row.key) && q["hub.mode"] === "subscribe" && q["hub.verify_token"] === row.verify_token) {
            return reply.code(200).type("text/plain").send(q["hub.challenge"]);
        }
        return reply.code(403).send({ error: "INVALID_WEBHOOK_VERIFICATION" });
    });

    app.post("/webhook/:key/:token", async (req, reply) => {
        const row = await prisma.channel.findFirst({
            where: { key: req.params.key, webhook_token: req.params.token, status: "connected" },
        });
        if (!row) return reply.code(404).send({ error: "CHANNEL_NOT_FOUND" });
        if (row.key === "web") return reply.code(405).send({ message: "Web chat uses the active widget client API" });

        let secrets;
        try { secrets = decrypt(row.config_enc); }
        catch (err) {
            req.log.error({ err, channelId: row.id }, "Unable to decrypt channel credentials");
            return reply.code(err.code === "CHANNELS_ENCRYPTION_NOT_CONFIGURED" ? 503 : 500)
                .send({ error: err.code || "CHANNEL_CREDENTIALS_UNAVAILABLE" });
        }
        const trusted =
            row.key === "whatsapp" || row.key === "social"
                ? verifyMetaSignature(req.rawBody, req.headers["x-hub-signature-256"], secrets.appSecret)
                : row.key === "voice"
                    ? verifyTwilioSignature(urlFor(row), req.body, req.headers["x-twilio-signature"], secrets.authToken)
                    : true;

        if (!trusted) return reply.code(401).send({ error: "UNAUTHORIZED_SIGNATURE" });

        for (const [index, m] of normalize(row.key, req.body).entries()) {
            const externalId = m.externalId
                ? String(m.externalId)
                : "fallback:" + crypto.createHash("sha256")
                    .update(JSON.stringify({ payload: req.body, message: m, index }))
                    .digest("hex");

            if (!m.externalId) {
                req.log.warn({ channel: row.key }, "Inbound provider event had no message ID; using deterministic fallback.");
            }

            if (!(await firstTime(row.id, externalId))) continue;

            try {
                await createTicketFromInbound({
                    orgId: row.org_id,
                    channel: row.key,
                    ...m,
                    externalId,
                });
            } catch (err) {
                await prisma.inboundEvent.deleteMany({
                    where: { channel_id: row.id, external_id: externalId },
                });
                throw err;
            }
        }
        await prisma.channel.update({ where: { id: row.id }, data: { last_event_at: new Date() } });

        if (row.key === "voice") {
            const recordingCallback = Boolean(req.body?.RecordingUrl);
            const terminalStatus = ["completed", "busy", "no-answer", "failed", "canceled"]
                .includes(String(req.body?.CallStatus || "").toLowerCase());

            const twiml = recordingCallback
                ? `<Response><Say>Thank you. Goodbye.</Say></Response>`
                : terminalStatus
                    ? `<Response></Response>`
                    : `<Response>
                        <Say>Thank you for contacting support. Please leave your message after the tone.</Say>
                        <Record
                            maxLength="120"
                            playBeep="true"
                            method="POST"
                            action="${urlFor(row)}"
                                    />
                    </Response>`;

            return reply.code(200).type("text/xml").send(twiml);
        }
        return reply.code(200).send({ status: "success" });
    });
}