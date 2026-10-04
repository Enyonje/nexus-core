// backend/routes/ticketsRoutes.js
// Ticket API for the dashboard and inbox.

import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";
import { toView } from "./ticketService.js";
import { addNote, sendReply } from "./replyService.js";
import { OutboundError } from "./outbound.js";

const STATUSES = ["open", "pending", "solved", "closed"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export default async function ticketsRoutes(app) {
    const staffOnly = guard({ app: "supportops", roles: ["agent", "management", "admin"] });
    const include = { customer: { select: { name: true, external_ref: true } } };

    // GET /?status=open|pending|solved|closed|all&assignee=me|none&limit=20
    app.get("/", { preHandler: staffOnly }, async (req) => {
        const { status = "open", assignee, limit = 20 } = req.query;
        const where = {
            org_id: req.access.org.id,
            ...(status === "all" ? {} : { status: STATUSES.includes(status) ? status : "open" }),
            ...(assignee === "me"
                ? { assignee_id: req.user.id }
                : assignee === "none"
                    ? { assignee_id: null }
                    : {}),
        };
        const rows = await prisma.supportTicket.findMany({
            where,
            include,
            orderBy: { created_at: "asc" },
            take: Math.min(Number(limit) || 20, 50),
        });
        return rows.map((t) => toView(t));
    });

    // GET /:number with the full conversation
    app.get("/:number", { preHandler: staffOnly }, async (req, reply) => {
        const ticket = await prisma.supportTicket.findUnique({
            where: { org_id_number: { org_id: req.access.org.id, number: Number(req.params.number) } },
            include: { ...include, messages: { orderBy: { created_at: "asc" } } },
        });
        if (!ticket) return reply.code(404).send({ message: "Ticket not found" });
        return {
            ...toView(ticket),
            messages: ticket.messages.map((m) => ({
                id: m.id,
                direction: m.direction,
                channel: m.channel,
                body: m.body,
                createdAt: m.created_at,
            })),
        };
    });

    // PATCH /:number { status?, priority?, assignToMe? }
    app.patch("/:number", { preHandler: staffOnly }, async (req, reply) => {
        const { status, priority, assignToMe } = req.body ?? {};
        if ((status && !STATUSES.includes(status)) || (priority && !PRIORITIES.includes(priority))) {
            return reply.code(400).send({ message: "Invalid status or priority" });
        }
        const where = { org_id_number: { org_id: req.access.org.id, number: Number(req.params.number) } };
        if (!(await prisma.supportTicket.findUnique({ where }))) {
            return reply.code(404).send({ message: "Ticket not found" });
        }

        const t = await prisma.supportTicket.update({
            where,
            include,
            data: {
                ...(status
                    ? { status, resolved_at: ["solved", "closed"].includes(status) ? new Date() : null }
                    : {}),
                ...(priority ? { priority } : {}),
                ...(assignToMe ? { assignee_id: req.user.id } : {}),
            },
        });
        return toView(t);
    });

    // POST /:number/reply { body }   delivers on the customer's channel, then records it
    // POST /:number/note  { body }   internal note, never sent
    for (const [path, action, code] of [
        ["reply", sendReply, 201],
        ["note", addNote, 201],
    ]) {
        app.post(`/:number/${path}`, { preHandler: staffOnly }, async (req, reply) => {
            const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
            if (!body || body.length > 4000) {
                return reply.code(400).send({ message: "Must be 1 to 4000 characters" });
            }
            try {
                return reply
                    .code(code)
                    .send(
                        await action({
                            orgId: req.access.org.id,
                            number: Number(req.params.number),
                            authorId: req.user.id,
                            body,
                        })
                    );
            } catch (err) {
                if (err instanceof OutboundError) {
                    return reply.code(err.status).send({ error: err.code, message: err.message });
                }
                throw err;
            }
        });
    }
}
