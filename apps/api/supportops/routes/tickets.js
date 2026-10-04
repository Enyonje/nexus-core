// supportops/routes/tickets.js
// Fastify plugin (the previous version was an Express router, which Fastify silently ignores).
// Mounted at /api/v1/supportops, so GET "/tickets" serves /api/v1/supportops/tickets.

import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";

export default async function ticketsRoutes(app) {
    // Same entitlement guard channelsRoutes uses. It replaces the Express `auth` + `tenantContext`
    // middleware and exposes the tenant as req.access.org. Add `roles: [...]` here to restrict it.
    const access = guard({ app: "supportops" });

    app.get(
        "/tickets",
        {
            preHandler: access,
            schema: {
                querystring: {
                    type: "object",
                    properties: {
                        status: { type: "string", maxLength: 32 },
                        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
                    },
                },
            },
        },
        async (req) => {
            const { status, limit } = req.query;

            // ASSUMPTIONS to check against schema.prisma: model `Ticket`, columns `org_id`, `status`, `created_at`
            return prisma.ticket.findMany({
                where: { org_id: req.access.org.id, ...(status ? { status } : {}) },
                orderBy: { created_at: "desc" },
                take: limit,
            });
        }
    );
}

// Kept so any other file importing these names keeps working
export { ticketsRoutes };
export const ticketRoutes = ticketsRoutes;