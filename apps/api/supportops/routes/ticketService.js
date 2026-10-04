// backend/routes/ticketService.js
// Turns every inbound message into a ticket (or a reply on an open one).

import { prisma } from "../config/prisma.js";
import { staff, push } from "./realtime.js";
import { canAppend, priorityFor, slaDueAt } from "./ticketRules.js";

export const toView = (t, customer) => ({
    id: `T-${t.number}`,
    number: t.number,
    subject: t.subject,
    customer:
        customer?.name ??
        customer?.external_ref ??
        t.customer?.name ??
        t.customer?.external_ref ??
        "Unknown",
    channel: t.channel,
    priority: t.priority,
    status: t.status,
    assigneeId: t.assignee_id,
    slaDueAt: t.sla_due_at,
});

const notify = (orgId, event, ticket, customer) =>
    push(staff, orgId, { type: "ticket", event, ticket: toView(ticket, customer) });

export async function createTicketFromInbound({
    orgId,
    channel,
    externalId,
    customerId,
    customer,
    subject,
    body,
}) {
    const now = new Date();
    const text = (body || subject || "").trim();

    const person = await prisma.supportCustomer.upsert({
        where: {
            org_id_channel_external_ref: {
                org_id: orgId,
                channel,
                external_ref: String(customerId ?? externalId),
            },
        },
        update: customer ? { name: customer } : {},
        create: {
            org_id: orgId,
            channel,
            external_ref: String(customerId ?? externalId),
            name: customer ?? null,
        },
    });

    const latest = await prisma.supportTicket.findFirst({
        where: { org_id: orgId, customer_id: person.id, channel },
        orderBy: { created_at: "desc" },
    });

    if (latest && canAppend(latest, now)) {
        const reopen = latest.status === "solved";
        const [, ticket] = await prisma.$transaction([
            prisma.supportTicketMessage.create({
                data: { ticket_id: latest.id, direction: "in", channel, body: text },
            }),
            prisma.supportTicket.update({
                where: { id: latest.id },
                data: {
                    last_message_at: now,
                    ...(reopen
                        ? {
                            status: "open",
                            resolved_at: null,
                            sla_due_at: slaDueAt(latest.priority, now),
                        }
                        : {}),
                },
            }),
        ]);
        notify(orgId, reopen ? "ticket_reopened" : "ticket_message", ticket, person);
        return ticket;
    }

    for (let attempt = 0; ; attempt++) {
        try {
            const last = await prisma.supportTicket.findFirst({
                where: { org_id: orgId },
                orderBy: { number: "desc" },
                select: { number: true },
            });
            const priority = priorityFor({
                channel,
                text: `${subject ?? ""} ${text}`,
            });
            const ticket = await prisma.supportTicket.create({
                data: {
                    org_id: orgId,
                    number: (last?.number ?? 1000) + 1,
                    customer_id: person.id,
                    channel,
                    subject: (subject || text || "(no subject)").slice(0, 120),
                    priority,
                    sla_due_at: slaDueAt(priority, now),
                    last_message_at: now,
                    messages: { create: { direction: "in", channel, body: text } },
                },
            });
            notify(orgId, "ticket_created", ticket, person);
            return ticket;
        } catch (err) {
            if (err.code !== "P2002" || attempt >= 3) throw err;
        }
    }
}

/* ---------- Fastify plugin ---------- */
export default async function ticketServiceRoutes(app) {
    // POST /create
    app.post("/create", async (req, reply) => {
        try {
            const ticket = await createTicketFromInbound(req.body);
            return reply.code(201).send(ticket);
        } catch (err) {
            return reply.code(err.statusCode || 500).send({ error: err.message });
        }
    });
}
