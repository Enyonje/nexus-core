/**
 * SupportOps Tickets Route Plugin
 * Path: supportops/routes/tickets.js
 */

import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";
import { predictSLARisk } from "../services/slaPredictor.js";

export default async function ticketsRoutes(app) {
    // Entitlement guard requiring "supportops" app permissions
    const access = guard({ app: "supportops" });

    // GET / (or relative to parent plugin prefix)
    app.get(
        "/",
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
        async (request, reply) => {
            const { status, limit = 20 } = request.query;

            // Extract orgId safely from guard context or fallback user claims
            const orgId =
                request.access?.org?.id ||
                request.currentUser?.org_id ||
                request.user?.orgId ||
                request.user?.org_id;

            if (!orgId) {
                return reply.code(400).send({
                    error: "MISSING_ORG_CONTEXT",
                    message: "Organization ID could not be determined from request context",
                });
            }

            try {
                // Fetch tickets for organization
                const tickets = await prisma.ticket.findMany({
                    where: {
                        org_id: orgId,
                        ...(status ? { status } : {}),
                    },
                    orderBy: { created_at: "desc" },
                    take: Number(limit),
                });

                // Compute backlog size (unresolved tickets)
                const backlogSize = tickets.filter(
                    (t) => (t.status || "").toLowerCase() !== "resolved"
                ).length;

                // Enrich tickets with SLA Risk scores
                const enrichedTickets = tickets.map((ticket) => {
                    const createdAtDate = ticket.created_at || ticket.createdAt
                        ? new Date(ticket.created_at || ticket.createdAt)
                        : new Date();

                    const ageMinutes = Math.max(0, (Date.now() - createdAtDate.getTime()) / 60000);

                    let prediction = { slaRiskScore: 0, slaStatus: "ON_TRACK" };

                    if (typeof predictSLARisk === "function") {
                        prediction = predictSLARisk({
                            ticketAgeMinutes: ageMinutes,
                            priority: ticket.priority || "Medium",
                            avgResolutionMinutes: 180,
                            backlogSize,
                            aiConfidence: ticket.ai_confidence ?? ticket.aiConfidence ?? 0.8,
                        });
                    }

                    return {
                        ...ticket,
                        slaRiskScore: prediction.slaRiskScore,
                        slaStatus: prediction.slaStatus,
                    };
                });

                return reply.code(200).send(enrichedTickets);
            } catch (err) {
                request.log.error(err);
                return reply.code(500).send({
                    error: "INTERNAL_SERVER_ERROR",
                    message: err.message || "Failed to fetch tickets",
                });
            }
        }
    );
}

// Named exports for backward compatibility across module imports
export { ticketsRoutes };
export const ticketRoutes = ticketsRoutes;