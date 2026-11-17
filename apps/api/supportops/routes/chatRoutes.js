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


const WIDGET_SCRIPT = String.raw`(() => {
  const script = document.currentScript;
  if (!script) return;

  const key = script.dataset.key;
  const api = (script.dataset.api || "").replace(/\/+$/, "");
  if (!key || !api) return;

  const root = document.createElement("div");
  root.id = "supportops-live-chat";
  root.innerHTML =
    '<style>' +
    '#so-chat-button{position:fixed;right:22px;bottom:22px;z-index:2147483000;border:0;border-radius:30px;padding:14px 20px;background:#2563eb;color:white;font:600 14px Arial;cursor:pointer;box-shadow:0 5px 24px #0004}' +
    '#so-chat-box{position:fixed;right:22px;bottom:82px;z-index:2147483000;width:min(350px,calc(100vw - 32px));height:440px;background:white;color:#111827;border-radius:14px;box-shadow:0 8px 40px #0004;display:none;overflow:hidden;font:14px Arial}' +
    '#so-chat-head{background:#1e40af;color:white;padding:16px;font-weight:bold}' +
    '#so-chat-messages{height:310px;overflow:auto;padding:12px;background:#f8fafc}' +
    '.so-chat-message{padding:9px 12px;margin:7px 0;border-radius:12px;max-width:85%;overflow-wrap:anywhere;white-space:pre-wrap}' +
    '.so-chat-visitor{background:#dbeafe;margin-left:auto}' +
    '.so-chat-agent{background:#e5e7eb;margin-right:auto}' +
    '#so-chat-form{display:flex;gap:6px;padding:10px;border-top:1px solid #e5e7eb}' +
    '#so-chat-input{min-width:0;flex:1;border:1px solid #d1d5db;border-radius:8px;padding:10px}' +
    '#so-chat-send{border:0;border-radius:8px;background:#2563eb;color:white;padding:0 14px;cursor:pointer}' +
    '</style>' +
    '<button id="so-chat-button" type="button">Chat with us</button>' +
    '<section id="so-chat-box" aria-label="Live chat">' +
    '<div id="so-chat-head">How can we help?</div>' +
    '<div id="so-chat-messages" aria-live="polite"></div>' +
    '<form id="so-chat-form"><input id="so-chat-input" maxlength="2000" placeholder="Write a message..." required>' +
    '<button id="so-chat-send" type="submit">Send</button></form></section>';

  document.body.appendChild(root);

  const button = root.querySelector("#so-chat-button");
  const box = root.querySelector("#so-chat-box");
  const messages = root.querySelector("#so-chat-messages");
  const form = root.querySelector("#so-chat-form");
  const input = root.querySelector("#so-chat-input");
  const send = root.querySelector("#so-chat-send");

  let conversationId = null;
  let secret = null;
  let seen = new Set();
  let polling = null;

  function addMessage(m) {
    if (!m || !m.id || seen.has(m.id)) return;
    seen.add(m.id);
    const el = document.createElement("div");
    el.className = "so-chat-message " +
      (m.sender === "visitor" ? "so-chat-visitor" : "so-chat-agent");
    el.textContent = m.body || "";
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  async function request(path, body) {
    const response = await fetch(
      api + "/api/v1/supportops/chat/widget/" + key + path,
      {
        method: body ? "POST" : "GET",
        headers: body ? {"Content-Type":"application/json"} : {},
        body: body ? JSON.stringify(body) : undefined
      }
    );
    if (!response.ok) {
      throw new Error("Chat request failed (" + response.status + ")");
    }
    return response.json();
  }

  async function refresh() {
    if (!conversationId || !secret) return;
    try {
      const rows = await request(
        "/" + conversationId + "/messages?secret=" + encodeURIComponent(secret)
      );
      if (Array.isArray(rows)) rows.forEach(addMessage);
    } catch (_) {}
  }

  function startPolling() {
    if (polling) clearInterval(polling);
    polling = setInterval(refresh, 4000);
  }

  button.addEventListener("click", () => {
    box.style.display = box.style.display === "block" ? "none" : "block";
    button.textContent = box.style.display === "block" ? "Close chat" : "Chat with us";
    if (box.style.display === "block") input.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = input.value.trim();
    if (!body) return;

    send.disabled = true;
    try {
      if (!conversationId) {
        const started = await request("/start", {message:body});
        conversationId = started.conversationId;
        secret = started.secret;

        try {
          localStorage.setItem(
            "so-chat-" + key,
            JSON.stringify({conversationId:conversationId,secret:secret})
          );
        } catch (_) {}

        seen.clear();
        startPolling();
      } else {
        const sent = await request(
          "/" + conversationId + "/messages",
          {body:body,secret:secret}
        );
        addMessage(sent);
      }

      input.value = "";
      await refresh();
    } catch (error) {
      alert(error.message || "Unable to send your message.");
    } finally {
      send.disabled = false;
      input.focus();
    }
  });

  try {
    const saved = JSON.parse(localStorage.getItem("so-chat-" + key) || "null");
    if (saved && saved.conversationId && saved.secret) {
      conversationId = saved.conversationId;
      secret = saved.secret;
      refresh();
      startPolling();
    }
  } catch (_) {}
})();`;

export default async function chatRoutes(app) {

  // Public browser widget loader. The widget API itself validates the website origin.
  app.get("/widget.js", async (_req, reply) => {
    return reply
      .header("Cache-Control", "public, max-age=300")
      .type("application/javascript; charset=utf-8")
      .send(WIDGET_SCRIPT);
  });

    /* ---------- public widget API ---------- */
    // Every /widget/ request must carry a valid key, and the page's origin must match the allowed domain.
    // NOTE: if you register @fastify/cors globally, allow these routes there too or it may answer first.
    app.addHook("onRequest", async (req, reply) => {
        if (!req.routeOptions?.url?.includes("/widget/") && !req.url.includes("/widget/")) return;
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