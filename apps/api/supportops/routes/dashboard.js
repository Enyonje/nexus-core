// src/routes/dashboard.js
import { prisma } from "../config/prisma.js";
import { guard } from "../security/entitlements.js";

export async function dashboardRoutes(app) {
    const getMetrics = async (req, reply) => {
        const timeframe = typeof req.query?.timeframe === "string" ? req.query.timeframe : "30d";
        // guard() resolves and authorizes the active workspace. Never fall back
        // to an unscoped query: that could expose metrics across organizations.
        const orgId = req.access?.org?.id;
        if (!orgId) {
            return reply.code(403).send({ error: "NO_ORGANIZATION", message: "Select an authorized workspace." });
        }

        try {
            const supportOpsApp = await prisma.app.findFirst({
                where: { slug: "supportops", active: true },
                select: { id: true },
            });
            const [totalTickets, openTickets, totalCustomers, activeSubscriptions, grouped, seatsUsed] = await Promise.all([
                prisma.supportTicket.count({ where: { org_id: orgId } }),
                prisma.supportTicket.count({ where: { org_id: orgId, status: { in: ["open", "pending"] } } }),
                prisma.supportCustomer.count({ where: { org_id: orgId } }),
                supportOpsApp
                    ? prisma.subscription.count({
                        where: { org_id: orgId, app_id: supportOpsApp.id, status: { in: ["active", "trialing"] } },
                    })
                    : 0,
                prisma.supportTicket.groupBy({
                    by: ["channel"],
                    where: { org_id: orgId },
                    _count: { channel: true },
                }),
                prisma.membership.count({ where: { org_id: orgId } }),
            ]);

            const byChannel = { whatsapp: 0, voice: 0, email: 0, web: 0, sms: 0, social: 0 };
            for (const group of grouped) {
                const key = String(group.channel || "").toLowerCase();
                if (Object.hasOwn(byChannel, key)) byChannel[key] = group._count.channel;
            }

            // Only return metrics backed by persisted data. The remaining
            // executive KPIs require event/invoice/CSAT instrumentation that
            // this schema does not currently store; null means unavailable.
            return reply.send({
                timeframe,
                mrr: null,
                mrrChange: null,
                customers: totalCustomers,
                customersChange: null,
                tickets: totalTickets,
                ticketsChange: null,
                backlog: openTickets,
                activeSubscriptions,
                slaCompliance: null,
                avgFirstResponseMin: null,
                avgResolutionHours: null,
                aiResolutionRate: null,
                csat: null,
                seatsUsed,
                seatLimit: null,
                byChannel,
                dataAvailability: {
                    mrr: "not_instrumented",
                    slaCompliance: "not_instrumented",
                    responseTimes: "not_instrumented",
                    aiResolutionRate: "not_instrumented",
                    csat: "not_instrumented",
                    seatLimit: "not_configured",
                },
            });
        } catch (err) {
            req.log?.error({ err, orgId }, "SupportOps dashboard metrics query failed");
            return reply.code(503).send({
                error: "METRICS_UNAVAILABLE",
                message: "SupportOps metrics could not be loaded. Please retry shortly.",
            });
        }
    };

    const readGuard = guard({ app: "supportops", roles: ["admin", "management", "agent"] });
    app.get("/dashboard/metrics", { preHandler: readGuard }, getMetrics);
    app.get("/metrics", { preHandler: readGuard }, getMetrics);

    app.get("/metrics/revenue", { preHandler: readGuard }, async (req, reply) => {
        // No invoice/payment history table exists in the current schema. Do not
        // invent a historical revenue series; expose an explicit empty state.
        return reply.send({
            data: [],
            available: false,
            reason: "REVENUE_HISTORY_NOT_INSTRUMENTED",
        });
    });
}

export default dashboardRoutes;