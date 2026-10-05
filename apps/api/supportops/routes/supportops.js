/**
 * SupportOps Core Routes
 * Path: supportops/routes/supportops.js
 */

import { guard } from "../security/entitlements.js";
import { prisma } from "../config/prisma.js"; // adjust path if needed

export default async function supportopsRoutes(app) {
    const access = guard({ app: "supportops" });

    // Base endpoint
    app.get("/", { preHandler: access }, async (req, reply) => {
        return reply.send({
            ok: true,
            service: "supportops-core",
            timestamp: new Date().toISOString(),
        });
    });

    // List organizations
    app.get("/orgs", { preHandler: access }, async (req, reply) => {
        try {
            const orgs = await prisma.organization.findMany({
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            });
            return reply.send(orgs);
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: "Failed to fetch organizations" });
        }
    });

    // Create a new support ticket
    app.post("/tickets", { preHandler: access }, async (req, reply) => {
        const { subject, description, orgId } = req.body;

        if (!subject || !description || !orgId) {
            return reply.code(400).send({ error: "subject, description, and orgId are required" });
        }

        try {
            const ticket = await prisma.ticket.create({
                data: {
                    subject,
                    description,
                    status: "open",
                    orgId,
                },
                select: {
                    id: true,
                    subject: true,
                    description: true,
                    status: true,
                    orgId: true,
                    createdAt: true,
                },
            });
            return reply.code(201).send(ticket);
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: "Failed to create ticket" });
        }
    });

    // Fetch tickets with pagination + filtering
    app.get("/tickets", { preHandler: access }, async (req, reply) => {
        const { orgId, status, page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);
        const take = Number(limit);

        try {
            const where = {};
            if (orgId) where.orgId = orgId;
            if (status) where.status = status;

            const [tickets, total] = await Promise.all([
                prisma.ticket.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                    select: {
                        id: true,
                        subject: true,
                        description: true,
                        status: true,
                        orgId: true,
                        createdAt: true,
                    },
                }),
                prisma.ticket.count({ where }),
            ]);

            return reply.send({
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit),
                tickets,
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: "Failed to fetch tickets" });
        }
    });

    // Full-text search with weighted ranking + highlighted snippets
    app.get("/tickets/search", { preHandler: access }, async (req, reply) => {
        const { query, page = 1, limit = 20 } = req.query;

        if (!query) {
            return reply.code(400).send({ error: "Search query is required" });
        }

        const skip = (Number(page) - 1) * Number(limit);

        try {
            const tickets = await prisma.$queryRawUnsafe(`
        SELECT t.id,
               t.subject,
               t.description,
               t.status,
               t.org_id AS "orgId",
               t.created_at AS "createdAt",
               ts_rank(
                 setweight(to_tsvector('english', t.subject), 'A') ||
                 setweight(to_tsvector('english', t.description), 'B') ||
                 setweight(to_tsvector('english', o.name), 'C'),
                 plainto_tsquery('english', $1)
               ) AS rank,
               ts_headline('english', t.subject, plainto_tsquery('english', $1),
                 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1') AS subject_snippet,
               ts_headline('english', t.description, plainto_tsquery('english', $1),
                 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2') AS description_snippet,
               ts_headline('english', o.name, plainto_tsquery('english', $1),
                 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1') AS org_snippet
        FROM tickets t
        JOIN organizations o ON o.id = t.org_id
        WHERE (
          setweight(to_tsvector('english', t.subject), 'A') ||
          setweight(to_tsvector('english', t.description), 'B') ||
          setweight(to_tsvector('english', o.name), 'C')
        ) @@ plainto_tsquery('english', $1)
        ORDER BY rank DESC, t.created_at DESC
        OFFSET $2 LIMIT $3
      `, query, skip, limit);

            const [{ count }] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*)::int
        FROM tickets t
        JOIN organizations o ON o.id = t.org_id
        WHERE (
          setweight(to_tsvector('english', t.subject), 'A') ||
          setweight(to_tsvector('english', t.description), 'B') ||
          setweight(to_tsvector('english', o.name), 'C')
        ) @@ plainto_tsquery('english', $1)
      `, query);

            return reply.send({
                page: Number(page),
                limit: Number(limit),
                total: count,
                totalPages: Math.ceil(count / limit),
                tickets,
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ error: "Failed to perform full-text search" });
        }
    });
}
