// backend/routes/replyService.js
// An agent's reply: deliver it on the customer's channel, then record it.

import { prisma } from "../config/prisma.js";
import { decrypt } from "./channelsRoutes.js";
import { addMessage } from "./chatRoutes.js";
import { staff, push } from "./realtime.js";
import { buildRequest, interpret, needsWindow, windowOpen, OutboundError } from "./outbound.js";
import { toView } from "./ticketService.js";

const view = (m) => ({
    id: m.id,
    direction: m.direction,
    channel: m.channel,
    body: m.body,
    createdAt: m.created_at,
});

async function findTicket(orgId, number) {
    const ticket = await prisma.supportTicket.findUnique({
        where: { org_id_number: { org_id: orgId, number } },
        include: { customer: true },
    });
    if (!ticket) throw new OutboundError("NOT_FOUND", "Ticket not found", 404);
    return ticket;
}

async function deliver(ticket, orgId, authorId, body) {
    const channel = ticket.channel;
    const to = ticket.customer.external_ref;

    if (channel === "web") {
        const conv = await prisma.conversation.findFirst({ where: { id: to, org_id: orgId } });
        if (!conv) throw new OutboundError("CONVERSATION_GONE", "This chat session no longer exists", 404);
        await addMessage(conv, "agent", body, authorId);
        return;
    }
    if (channel === "voice") buildRequest("voice", {}); // throws the "call back" error

    const row = await prisma.channel.findFirst({
        where: { org_id: orgId, key: channel, status: "connected" },
    });
    if (!row) throw new OutboundError("CHANNEL_NOT_CONNECTED", `${channel} is not connected for this workspace`, 409);

    if (needsWindow(channel)) {
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

export async function sendReply({ orgId, number, authorId, body }) {
    const ticket = await findTicket(orgId, number);
    if (ticket.status === "closed") throw new OutboundError("TICKET_CLOSED", "This ticket is closed. Reopen it to reply.", 409);

    await deliver(ticket, orgId, authorId, body);

    const now = new Date();
    const [message, updated] = await prisma.$transaction([
        prisma.supportTicketMessage.create({
            data: { ticket_id: ticket.id, direction: "out", channel: ticket.channel, author_id: authorId, body },
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

export async function addNote({ orgId, number, authorId, body }) {
    const ticket = await findTicket(orgId, number);
    const note = await prisma.supportTicketMessage.create({
        data: { ticket_id: ticket.id, direction: "note", channel: ticket.channel, author_id: authorId, body },
    });
    return view(note);
}

/* ---------- Fastify plugin ---------- */
export default async function replyServiceRoutes(app) {
    // POST /reply
    app.post("/reply", async (req, reply) => {
        try {
            const result = await sendReply(req.body);
            return reply.code(201).send(result);
        } catch (err) {
            return reply.code(err.statusCode || 500).send({ error: err.message });
        }
    });

    // POST /note
    app.post("/note", async (req, reply) => {
        try {
            const result = await addNote(req.body);
            return reply.code(201).send(result);
        } catch (err) {
            return reply.code(err.statusCode || 500).send({ error: err.message });
        }
    });
}
