// supportops/routes/tickets.js
import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";

export default async function ticketsRoutes(app) {
    // Entitlement guard requiring "supportops" app permissions
    const access = guard({ app: "supportops" });

    // GET /api/v1/supportops/tickets
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
        async (req, reply) => {
            const { status, limit = 20 } = req.query;
            const orgId = req.access?.org?.id;

            if (!orgId) {
                return reply.code(400).send({
                    error: "MISSING_ORG_CONTEXT",
                    message: "Organization ID could not be determined from user token"
                });
            }

            const tickets = await prisma.ticket.findMany({
                where: {
                    org_id: orgId,
                    ...(status ? { status } : {})
                },
                orderBy: { created_at: "desc" },
                take: Number(limit),
            });

            return reply.send(tickets);
        }
    );
}

// Named exports to maintain backward compatibility across module imports
export { ticketsRoutes };
export const ticketRoutes = ticketsRoutes;