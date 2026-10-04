// backend/routes/channelsRoutes.js
// Admin-managed channel connections + public inbound webhooks.
//
// 1) Add to schema.prisma (and `channels Channel[]` on Organization), then migrate:
//
//   model Channel {
//     id            String    @id @default(uuid())
//     org_id        String
//     key           String                      // whatsapp | voice | sms | email | web | social
//     status        String    @default("connected")
//     config_enc    String                      // AES-256-GCM encrypted credentials
//     public_config Json      @default("{}")    // non-secret fields shown back to the admin
//     webhook_token String    @unique           // random, lives in the webhook URL
//     verify_token  String                      // WhatsApp handshake
//     last_event_at DateTime?
//     created_at    DateTime  @default(now())
//     updated_at    DateTime  @updatedAt
//     org           Organization @relation(fields: [org_id], references: [id], onDelete: Cascade)
//     @@unique([org_id, key])
//     @@map("channels")
//   }
//
//   model InboundEvent {            // idempotency: providers retry, we must not create duplicate tickets
//     id          String   @id @default(uuid())
//     channel_id  String
//     external_id String
//     created_at  DateTime @default(now())
//     channel     Channel  @relation(fields: [channel_id], references: [id], onDelete: Cascade)
//     @@unique([channel_id, external_id])
//     @@map("inbound_events")
//   }   (and `events InboundEvent[]` on Channel)
//
// 2) Env:  CHANNELS_ENC_KEY=$(openssl rand -base64 32)   PUBLIC_API_URL=https://api.yourdomain.com
// 3) Register: await app.register(channelsRoutes, { prefix: "/api/v1/supportops/tickets/channels" });
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";
import { createTicketFromInbound } from "./ticketService.js";
import { normalize, verifyMetaSignature, verifyTwilioSignature } from "./inbound.js";

const SECRETS = {
    whatsapp: ["accessToken", "appSecret"],
    voice: ["authToken"],
    sms: ["apiKey"],
    email: ["postmarkToken"], // outbound replies via Postmark
    web: [],
    social: ["pageAccessToken", "appSecret"],
};

/* ---------- encryption at rest ---------- */
const KEY = Buffer.from(process.env.CHANNELS_ENC_KEY ?? "", "base64");
const encrypt = (obj) => {
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
    return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};
export const decrypt = (s) => {
    const [iv, tag, data] = s.split(".").map((x) => Buffer.from(x, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
};
const rand = (n) => crypto.randomBytes(n).toString("hex");

const urlFor = (row) =>
    `${process.env.PUBLIC_API_URL}/api/v1/supportops/tickets/channels/webhook/${row.key}/${row.webhook_token}`;

const view = (row, isAdmin) => ({
    key: row.key,
    connected: row.status === "connected",
    lastEventAt: row.last_event_at,
    publicConfig: row.public_config,
    ...(isAdmin ? { webhookUrl: urlFor(row), verifyToken: row.verify_token } : {}),
});

// Returns false if this provider message was already processed (retry)
async function firstTime(channelId, externalId) {
    if (!externalId) return true;
    try {
        await prisma.inboundEvent.create({ data: { channel_id: channelId, external_id: String(externalId) } });
        return true;
    } catch (err) {
        if (err.code === "P2002") return false;
        throw err;
    }
}

export default async function channelsRoutes(app) {
    if (KEY.length !== 32) throw new Error("CHANNELS_ENC_KEY must be 32 bytes, base64 encoded");

    // Keep the raw body so provider signatures can be verified
    app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
        req.rawBody = body;
        try { done(null, JSON.parse(body.toString("utf8") || "{}")); }
        catch (err) { err.statusCode = 400; done(err); }
    });

    // Twilio and Africa's Talking post form-encoded bodies
    app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (req, body, done) =>
        done(null, Object.fromEntries(new URLSearchParams(body)))
    );

    const read = guard({ app: "supportops", roles: ["admin", "management"] });
    const admin = guard({ app: "supportops", roles: ["admin"] });
    const where = (req) => ({ org_id_key: { org_id: req.access.org.id, key: req.params.key } });

    /* ---------- admin API ---------- */
    app.get("/", { preHandler: read }, async (req) => {
        const rows = await prisma.channel.findMany({ where: { org_id: req.access.org.id } });
        return rows.map((r) => view(r, req.access.appRole === "admin"));
    });

    app.put("/:key", { preHandler: admin }, async (req, reply) => {
        const { key } = req.params;
        if (!SECRETS[key]) return reply.code(404).send({ message: "Unknown channel" });

        const incoming = Object.entries(req.body?.config ?? {}).slice(0, 10);
        const existing = await prisma.channel.findUnique({ where: where(req) });
        const secrets = existing ? decrypt(existing.config_enc) : {};
        const pub = {};

        for (const [k, v] of incoming) {
            if (typeof v !== "string" || v.length > 2000) continue;
            if (SECRETS[key].includes(k)) { if (v.trim()) secrets[k] = v.trim(); } // blank keeps the saved secret
            else pub[k] = v.trim();
        }

        const row = await prisma.channel.upsert({
            where: where(req),
            update: { config_enc: encrypt(secrets), public_config: pub, status: "connected" },
            create: { org_id: req.access.org.id, key, config_enc: encrypt(secrets), public_config: pub, webhook_token: rand(24), verify_token: rand(16) },
        });
        return view(row, true);
    });

    app.delete("/:key", { preHandler: admin }, async (req) => {
        await prisma.channel.deleteMany({ where: { org_id: req.access.org.id, key: req.params.key } });
        return { ok: true };
    });

    app.post("/:key/test", { preHandler: admin }, async (req, reply) => {
        const row = await prisma.channel.findUnique({ where: where(req) });
        if (!row) return reply.code(404).send({ message: "Channel is not connected" });
        if (row.key !== "whatsapp") return { ok: true, message: "Saved. Automatic testing is not available for this channel yet." };

        const { accessToken } = decrypt(row.config_enc);
        const res = await fetch(`https://graph.facebook.com/v20.0/${row.public_config.phoneNumberId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return res.ok ? { ok: true, message: "WhatsApp credentials are valid" } : { ok: false, message: "WhatsApp rejected these credentials" };
    });

    /* ---------- public inbound webhooks (no login; secret URL token + provider signature) ---------- */
    // Meta handshake for WhatsApp, Messenger and Instagram
    app.get("/webhook/:key/:token", async (req, reply) => {
        const row = await prisma.channel.findFirst({
            where: { key: req.params.key, webhook_token: req.params.token, status: "connected" },
        });
        const q = req.query ?? {};
        if (row && ["whatsapp", "social"].includes(row.key) && q["hub.mode"] === "subscribe" && q["hub.verify_token"] === row.verify_token) {
            return reply.code(200).type("text/plain").send(q["hub.challenge"]);
        }
        return reply.code(403).send();
    });

    app.post("/webhook/:key/:token", async (req, reply) => {
        const row = await prisma.channel.findFirst({
            where: { key: req.params.key, webhook_token: req.params.token, status: "connected" },
        });
        if (!row) return reply.code(404).send();
        if (row.key === "web") return reply.code(405).send({ message: "Web chat uses the widget API" });

        // 1) authenticate the sender
        const secrets = decrypt(row.config_enc);
        const trusted =
            row.key === "whatsapp" || row.key === "social"
                ? verifyMetaSignature(req.rawBody, req.headers["x-hub-signature-256"], secrets.appSecret)
                : row.key === "voice"
                    ? verifyTwilioSignature(urlFor(row), req.body, req.headers["x-twilio-signature"], secrets.authToken)
                    : true; // SMS and email providers don't sign: the secret URL token is the credential
        if (!trusted) return reply.code(401).send();

        // 2) turn the provider payload into tickets, once each
        for (const m of normalize(row.key, req.body)) {
            if (!(await firstTime(row.id, m.externalId))) continue;
            try {
                await createTicketFromInbound({ orgId: row.org_id, channel: row.key, ...m });
            } catch (err) {
                // let the provider retry this message
                await prisma.inboundEvent.deleteMany({ where: { channel_id: row.id, external_id: String(m.externalId) } });
                throw err;
            }
        }
        await prisma.channel.update({ where: { id: row.id }, data: { last_event_at: new Date() } });

        // 3) answer in the format the provider expects
        if (row.key === "voice") {
            return reply.code(200).type("text/xml").send(
                `<Response><Say>Thanks for calling. Please leave a message after the tone.</Say><Record maxLength="120" action="${urlFor(row)}"/></Response>`
            );
        }
        return reply.code(200).send();
    });
}