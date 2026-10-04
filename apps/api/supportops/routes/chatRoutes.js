// backend/routes/chatRoutes.js  In-app live chat: public widget API + agent API, realtime over SSE.
//
// 1) schema.prisma (add `conversations Conversation[]` to Organization), then migrate:
//
//   model Conversation {
//     id                  String    @id @default(uuid())
//     org_id              String
//     channel_key         String    @default("web")
//     visitor_secret_hash String
//     visitor_name        String?
//     status              String    @default("open")      // open | closed
//     assignee_id         String?
//     created_at          DateTime  @default(now())
//     last_message_at     DateTime  @default(now())
//     org                 Organization @relation(fields: [org_id], references: [id], onDelete: Cascade)
//     messages            Message[]
//     @@index([org_id, status, last_message_at])
//     @@map("conversations")
//   }
//   model Message {
//     id              String   @id @default(uuid())
//     conversation_id String
//     sender          String                              // visitor | agent | system
//     sender_id       String?
//     body            String
//     created_at      DateTime @default(now())
//     conversation    Conversation @relation(fields: [conversation_id], references: [id], onDelete: Cascade)
//     @@index([conversation_id, created_at])
//     @@map("messages")
//   }
//
// 2) Register: await app.register(chatRoutes, { prefix: "/api/v1/supportops/chat" });
import crypto from "node:crypto";
import { prisma } from "../lib/deps.js";
import { guard } from "../security/entitlements.js";
import { createTicketFromInbound } from "./ticketService.js";
import { visitors, staff, openStream, push } from "./realtime.js";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const text = (v) => (typeof v === "string" ? v.trim().slice(0, 2000) : "");

export async function addMessage(conv, sender, body, senderId = null) {
    const m = await prisma.message.create({ data: { conversation_id: conv.id, sender, sender_id: senderId, body } });
    await prisma.conversation.update({ where: { id: conv.id }, data: { last_message_at: m.created_at, status: "open" } });
    const message = { id: m.id, sender, body, createdAt: m.created_at };
    const event = { type: "message", conversationId: conv.id, message };
    push(visitors, conv.id, event);
    push(staff, conv.org_id, event);
    return message;
}

export default async function chatRoutes(app) {
    /* ---------- public widget API ---------- */
    // Every /widget/ request must carry a valid key, and the page's origin must match the allowed domain.
    // NOTE: if you register @fastify/cors globally, allow these routes there too or it may answer first.
    app.addHook("onRequest", async (req, reply) => {
        if (!req.routeOptions?.url?.includes("/widget/")) return;
        const ch = await prisma.channel.findFirst({ where: { key: "web", webhook_token: req.params.key, status: "connected" } });
        if (!ch) return reply.code(404).send({ message: "Chat is not available" });
        req.channel = ch;

        const origin = req.headers.origin;
        if (origin) {
            let host = "";
            try { host = new URL(origin).hostname; } catch { /* invalid origin */ }
            const allowed = ch.public_config?.allowedDomain;
            const ok = allowed && (host === allowed || host.endsWith(`.${allowed}`));
            if (!ok && !(process.env.NODE_ENV !== "production" && host === "localhost")) {
                return reply.code(403).send({ message: "Domain not allowed" });
            }
            reply.header("Access-Control-Allow-Origin", origin).header("Vary", "Origin")
                .header("Access-Control-Allow-Headers", "Content-Type").header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        }
    });
    app.options("/widget/:key/*", async (req, reply) => reply.code(204).send());

    const visitorConv = async (req) => {
        const secret = req.body?.secret ?? req.query?.secret ?? "";
        const conv = await prisma.conversation.findFirst({ where: { id: req.params.cid, org_id: req.channel.org_id } });
        return conv && same(sha(secret), conv.visitor_secret_hash) ? conv : null;
    };

    app.post("/widget/:key/start", async (req, reply) => {
        const body = text(req.body?.message);
        if (!body) return reply.code(400).send({ message: "Message required" });
        const secret = crypto.randomBytes(24).toString("hex");
        const name = text(req.body?.name).slice(0, 80) || null;

        const conv = await prisma.conversation.create({
            data: { org_id: req.channel.org_id, visitor_secret_hash: sha(secret), visitor_name: name },
        });
        await addMessage(conv, "visitor", body);
        await createTicketFromInbound({
            orgId: conv.org_id, channel: "web", externalId: conv.id, customerId: conv.id,
            customer: name ?? "Website visitor", subject: body.slice(0, 80), body,
        });
        push(staff, conv.org_id, { type: "conversation", conversationId: conv.id });
        return reply.code(201).send({ conversationId: conv.id, secret });
    });

    app.post("/widget/:key/:cid/messages", async (req, reply) => {
        const conv = await visitorConv(req);
        const body = text(req.body?.body);
        if (!conv || !body) return reply.code(conv ? 400 : 403).send({ message: "Not allowed" });
        return reply.code(201).send(await addMessage(conv, "visitor", body));
    });

    app.get("/widget/:key/:cid/messages", async (req, reply) => {
        const conv = await visitorConv(req);
        if (!conv) return reply.code(403).send({ message: "Not allowed" });
        const rows = await prisma.message.findMany({ where: { conversation_id: conv.id }, orderBy: { created_at: "asc" }, take: 100 });
        return rows.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at }));
    });

    app.get("/widget/:key/:cid/stream", async (req, reply) => {
        const conv = await visitorConv(req);
        if (!conv) return reply.code(403).send({ message: "Not allowed" });
        openStream(reply, visitors, conv.id);
    });

    /* ---------- agent API ---------- */
    const staffOnly = guard({ app: "supportops", roles: ["agent", "management", "admin"] });
    const mine = (req) => prisma.conversation.findFirst({ where: { id: req.params.id, org_id: req.access.org.id } });

    app.get("/conversations", { preHandler: staffOnly }, async (req) => {
        const rows = await prisma.conversation.findMany({
            where: { org_id: req.access.org.id, status: req.query.status === "closed" ? "closed" : "open" },
            orderBy: { last_message_at: "desc" },
            take: 50,
            include: { messages: { orderBy: { created_at: "desc" }, take: 1 } },
        });
        return rows.map((c) => ({
            id: c.id, name: c.visitor_name ?? "Website visitor", status: c.status,
            lastMessage: c.messages[0]?.body ?? "", lastMessageAt: c.last_message_at,
        }));
    });

    app.get("/conversations/:id/messages", { preHandler: staffOnly }, async (req, reply) => {
        const c = await mine(req);
        if (!c) return reply.code(404).send({ message: "Not found" });
        const rows = await prisma.message.findMany({ where: { conversation_id: c.id }, orderBy: { created_at: "asc" }, take: 200 });
        return rows.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.created_at }));
    });

    app.post("/conversations/:id/messages", { preHandler: staffOnly }, async (req, reply) => {
        const c = await mine(req);
        const body = text(req.body?.body);
        if (!c || !body) return reply.code(c ? 400 : 404).send({ message: "Not allowed" });
        return reply.code(201).send(await addMessage(c, "agent", body, req.user.id));
    });

    app.post("/conversations/:id/close", { preHandler: staffOnly }, async (req, reply) => {
        const c = await mine(req);
        if (!c) return reply.code(404).send({ message: "Not found" });
        await prisma.conversation.update({ where: { id: c.id }, data: { status: "closed" } });
        return { ok: true };
    });

    app.get("/stream", { preHandler: staffOnly }, async (req, reply) => {
        openStream(reply, staff, req.access.org.id);
    });
}