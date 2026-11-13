// apps/api/supportops/routes/replyService.js
import { prisma } from "../lib/deps.js";
import { decrypt } from "./channelsRoutes.js";
import { addMessage } from "./chatRoutes.js";
import { staff, push } from "./realtime.js";
import { buildRequest, interpret, needsWindow, windowOpen, OutboundError } from "./outbound.js";
import { toView } from "./ticketService.js";
import { listTemplates } from "./templateService.js";
import { render, validateParams } from "./templates.js";

const view = (m) => ({
    id: m.id,
    direction: m.direction,
    channel: m.channel,
    body: m.body,
    createdAt: m.created_at,
});

async function findTicket(orgId, number) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { org_id_number: { org_id: orgId, number: Number(number) } },
        include: { customer: true },
    });
    if (!ticket) throw new OutboundError("NOT_FOUND", "Ticket not found", 404);
    return ticket;
}

async function deliver(ticket, orgId, authorId, body, template) {
    const channel = ticket.channel;
    const to = ticket.customer.external_ref;

    if (channel === "web") {
        const conv = await prisma.conversation.findFirst({ where: { id: to, org_id: orgId } });
        if (!conv) throw new OutboundError("CONVERSATION_GONE", "This chat session no longer exists", 404);
        await addMessage(conv, "agent", body, authorId);
        return;
    }
    if (channel === "voice") buildRequest("voice", {}); // throws the "call back" error

    const row = await prisma.channel.findFirst({ where: { org_id: orgId, key: channel, status: "connected" } });
    if (!row) throw new OutboundError("CHANNEL_NOT_CONNECTED", `${channel} is not connected for this workspace`, 409);

    if (needsWindow(channel) && !template) {
        const lastIn = await prisma.supportTicketMessage.findFirst({
            where: { ticket_id: ticket.id, direction: "in" },
            orderBy: { created_at: "desc" },
            select: { created_at: true },
        });
        if (!windowOpen(lastIn?.created_at)) {
            throw new OutboundError(
                "WINDOW_CLOSED",
                "More than 24 hours have passed since the customer last wrote. This channel only allows replies inside that window.",
                422
            );
        }
    }

    const { url, init } = buildRequest(channel, {
        secrets: decrypt(row.config_enc),
        config: row.public_config,
        to,
        body,
        subject: ticket.subject,
        template,
    });

    let res, data = {};
    try {
        res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
        data = await res.json().catch(() => ({}));
    } catch {
        throw new OutboundError("PROVIDER_UNREACHABLE", "Could not reach the provider. Please try again.", 502);
    }

    const result = interpret(channel, res.status, data);
    if (!result.ok) {
        console.error(`[reply] ${channel} rejected ticket T-${ticket.number}:`, result.error);
        throw new OutboundError("PROVIDER_REJECTED", result.error || "The provider rejected the message", 502);
    }
}

/**
 * Delivers and logs a customer reply
 */
export async function sendReply(params) {
    const { orgId, number, authorId, body, template } = params;
    const ticket = await findTicket(orgId, number);
    if (ticket.status === "closed") throw new OutboundError("TICKET_CLOSED", "This ticket is closed. Reopen it to reply.", 409);

    let text = body;
    let tpl;
    if (template) {
        if (ticket.channel !== "whatsapp") throw new OutboundError("TEMPLATE_UNSUPPORTED", "Templates are only for WhatsApp", 422);
        const t = (await listTemplates(orgId)).find((x) => x.name === template.name && x.language === template.language);
        if (!t || !t.supported) throw new OutboundError("TEMPLATE_NOT_FOUND", "That template is not available or not approved", 404);
        const v = validateParams(t.paramCount, template.params);
        if (!v.ok) throw new OutboundError("TEMPLATE_PARAMS", v.error, 400);
        tpl = { name: t.name, language: t.language, params: v.params };
        text = render(t.body, v.params);
    }

    await deliver(ticket, orgId, authorId, text, tpl);

    const now = new Date();
    const [message, updated] = await prisma.$transaction([
        prisma.supportTicketMessage.create({
            data: { ticket_id: ticket.id, direction: "out", channel: ticket.channel, author_id: authorId, body: text },
        }),
        prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
                first_response_at: ticket.first_response_at ?? now,
                last_message_at: now,
                ...(ticket.status === "open" ? { status: "pending" } : {}),
            },
        }),
    ]);
    push(staff, orgId, { type: "ticket", event: "ticket_reply", ticket: toView(updated, ticket.customer) });
    return view(message);
}

/**
 * Creates an internal note on a ticket
 */
export async function addNote(params) {
    const { orgId, number, authorId, body } = params;
    const ticket = await findTicket(orgId, number);
    const note = await prisma.supportTicketMessage.create({
        data: { ticket_id: ticket.id, direction: "note", channel: ticket.channel, author_id: authorId, body },
    });
    return view(note);
}

/**
 * Fastify Plugin Route Handler
 */
export default async function replyServiceRoutes(fastify, options) {
    // POST /:number/reply
    fastify.post("/:number/reply", async (request, reply) => {
        const orgId = request.headers["x-org-id"] || request.user?.orgId;
        const { number } = request.params;
        const authorId = request.user?.id;
        const { body, template } = request.body || {};

        if (!orgId) return reply.code(400).send({ error: "MISSING_ORG_ID" });
        if (!body && !template) return reply.code(400).send({ error: "REPLY_CONTENT_REQUIRED" });

        try {
            const res = await sendReply({ orgId, number, authorId, body, template });
            return reply.code(201).send({ success: true, data: res });
        } catch (err) {
            if (err instanceof OutboundError) {
                return reply.code(err.statusCode || 400).send({ error: err.code, message: err.message });
            }
            request.log.error(err, "Failed to send reply");
            return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR", message: err.message });
        }
    });

    // POST /:number/notes
    fastify.post("/:number/notes", async (request, reply) => {
        const orgId = request.headers["x-org-id"] || request.user?.orgId;
        const { number } = request.params;
        const authorId = request.user?.id;
        const { body } = request.body || {};

        if (!orgId) return reply.code(400).send({ error: "MISSING_ORG_ID" });
        if (!body) return reply.code(400).send({ error: "NOTE_BODY_REQUIRED" });

        try {
            const res = await addNote({ orgId, number, authorId, body });
            return reply.code(201).send({ success: true, data: res });
        } catch (err) {
            if (err instanceof OutboundError) {
                return reply.code(err.statusCode || 400).send({ error: err.code, message: err.message });
            }
            request.log.error(err, "Failed to add note");
            return reply.code(500).send({ error: "INTERNAL_SERVER_ERROR", message: err.message });
        }
    });
}