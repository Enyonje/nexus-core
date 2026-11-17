import { prisma } from "../lib/deps.js";
import { guard } from "../security/entitlements.js";

const readGuard = guard({ app: "supportops", roles: ["admin", "management", "agent", "investor"] });
const DAY = 24 * 60 * 60 * 1000;

function timeframeStart(value) {
  const days = ({ "7d": 7, "30d": 30, "90d": 90 })[value] || 30;
  return new Date(Date.now() - days * DAY);
}

function average(values) {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : null;
}

export async function dashboardRoutes(app) {
  app.get("/dashboard/metrics", { preHandler: readGuard }, async (req, reply) => {
    const orgId = req.access?.org?.id;
    if (!orgId) return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_REQUIRED" });

    const timeframe = ["7d", "30d", "90d"].includes(req.query?.timeframe) ? req.query.timeframe : "30d";
    const since = timeframeStart(timeframe);
    const where = { org_id: orgId, created_at: { gte: since } };

    const [tickets, openTickets, customers, channelGroups, responseRows, resolvedRows, memberships, aiUsage, activeIncidents, criticalIncidents, plan] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { org_id: orgId, status: { in: ["open", "pending"] } } }),
      prisma.supportCustomer.count({ where: { org_id: orgId } }),
      prisma.supportTicket.groupBy({ by: ["channel"], where, _count: { _all: true } }),
      prisma.supportTicket.findMany({ where: { ...where, first_response_at: { not: null } }, select: { created_at: true, first_response_at: true }, take: 1000 }),
      prisma.supportTicket.findMany({ where: { ...where, resolved_at: { not: null } }, select: { created_at: true, resolved_at: true, sla_due_at: true }, take: 1000 }),
      prisma.membership.count({ where: { org_id: orgId } }),
      prisma.aIUsage.aggregate({
        where: { org_id: orgId, created_at: { gte: since } },
        _count: { _all: true },
        _sum: { cost_usd: true, total_tokens: true },
      }),
      prisma.incident.count({ where: { org_id: orgId, resolved_at: null } }),
      prisma.incident.count({ where: { org_id: orgId, resolved_at: null, severity: "critical" } }),
      Promise.resolve(req.access?.plan || null),
    ]);

    const byChannel = {};
    for (const row of channelGroups) byChannel[String(row.channel || "unknown").toLowerCase()] = row._count._all;
    const firstResponseMinutes = responseRows.map((row) => (row.first_response_at - row.created_at) / 60000).filter(Number.isFinite);
    const resolutionHours = resolvedRows.map((row) => (row.resolved_at - row.created_at) / 3600000).filter(Number.isFinite);
    const slaEligible = resolvedRows.filter((row) => row.sla_due_at);
    const slaCompliance = slaEligible.length ? Number((slaEligible.filter((row) => row.resolved_at <= row.sla_due_at).length / slaEligible.length * 100).toFixed(1)) : null;
    const limits = plan?.limits && typeof plan.limits === "object" ? plan.limits : {};
    const seatLimit = Number(limits.seats ?? limits.seat_limit ?? 0) || null;

    return {
      timeframe,
      tickets,
      backlog: openTickets,
      customers,
      seatsUsed: memberships,
      seatLimit,
      byChannel,
      avgFirstResponseMin: average(firstResponseMinutes),
      avgResolutionHours: average(resolutionHours),
      slaCompliance,
      // Billing intervals and historical invoice records are not available.
      mrr: null,
      mrrCurrency: null,
      aiUsageEvents: aiUsage._count._all,
      aiCostUsd: aiUsage._sum.cost_usd,
      aiTokens: aiUsage._sum.total_tokens,
      activeIncidents,
      criticalIncidents,
      mrrChange: null,
      customersChange: null,
      ticketsChange: null,
      aiResolutionRate: null,
      csat: null,
      dataAvailability: {
        revenueTrend: false,
        mrr: false,
        csat: false,
        aiResolutionRate: false,
        aiUsage: true,
        aiCost: true,
        incidents: true,
        periodComparisons: false,
      },
    };
  });

  // Revenue history is not fabricated. Invoice history is not currently stored
  // in the Nexus schema, so the API explicitly reports that this chart is unavailable.
  app.get("/metrics/revenue", { preHandler: readGuard }, async (req, reply) => {
    if (!req.access?.org?.id) return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_REQUIRED" });
    return reply.send({ data: [], available: false, message: "Historical invoice data is not connected yet." });
  });
}

export default dashboardRoutes;
