/**
 * Organization Analytics Controller
 * Path: supportops/controllers/orgAnalyticsController.js
 */

import { Ticket } from "../models/Ticket.js";
import { AIUsage } from "../models/AIUsage.js";
import { AIActionProposal } from "../models/AIActionProposal.js";

/**
 * Extracts normalized organization context from Fastify request
 */
function getAuthContext(request) {
  const orgId =
    request.access?.org?.id ||
    request.currentUser?.org_id ||
    request.user?.orgId ||
    request.user?.org_id ||
    null;

  return { orgId };
}

/**
 * Retrieves high-level support, AI resolution, and spend metrics for an organization.
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function getOrgAnalytics(request, reply) {
  const { orgId } = getAuthContext(request);
  const pg = request.server.pg;
  const prisma = request.server.prisma;

  if (!orgId) {
    return reply.code(400).send({
      error: "BAD_REQUEST",
      message: "Organization context (org_id) is missing from request context",
    });
  }

  // Fast path: Prisma ORM execution if available
  if (prisma && typeof prisma.$queryRawUnsafe === "function") {
    try {
      const [
        totalTicketsRes,
        aiResolvedRes,
        humanResolvedRes,
        spendRes,
        avgResponseRes,
      ] = await Promise.all([
        prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM tickets WHERE org_id = $1 AND deleted_at IS NULL`,
          orgId
        ),
        prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM ai_action_proposals WHERE org_id = $1 AND status = 'approved'`,
          orgId
        ),
        prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS total FROM ai_action_proposals WHERE org_id = $1 AND status = 'rejected'`,
          orgId
        ),
        prisma.$queryRawUnsafe(
          `SELECT COALESCE(SUM(cost_usd), 0)::float AS total_cost FROM ai_usage WHERE org_id = $1`,
          orgId
        ),
        prisma.$queryRawUnsafe(
          `SELECT COALESCE(AVG(response_time_minutes), 0)::float AS avg_response FROM tickets WHERE org_id = $1 AND deleted_at IS NULL`,
          orgId
        ),
      ]);

      const totalTickets = Number(totalTicketsRes[0]?.total || 0);
      const aiResolved = Number(aiResolvedRes[0]?.total || 0);
      const humanResolved = Number(humanResolvedRes[0]?.total || 0);
      const totalAISpend = parseFloat(spendRes[0]?.total_cost || 0);
      const avgResponseTime = Math.round(parseFloat(avgResponseRes[0]?.avg_response || 0));

      const aiResolutionRate = totalTickets === 0 ? 0 : Math.round((aiResolved / totalTickets) * 100);

      return reply.code(200).send({
        totalTickets,
        aiResolved,
        humanResolved,
        aiResolutionRate,
        avgResponseTime,
        totalAISpend: parseFloat(totalAISpend.toFixed(4)),
      });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: "Failed to calculate organization analytics metrics",
      });
    }
  }

  // Fallback path: Direct fastify-postgres (pg) client execution
  if (!pg) {
    return reply.code(500).send({
      error: "DATABASE_NOT_CONFIGURED",
      message: "Neither Prisma nor Fastify Postgres client is initialized",
    });
  }

  const client = await pg.connect();

  try {
    // Parallelize all analytics database calls
    const [
      ticketsRes,
      aiResolvedRes,
      humanResolvedRes,
      spendRes,
      avgResponseRes,
    ] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS total FROM tickets WHERE org_id = $1 AND deleted_at IS NULL`,
        [orgId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM ai_action_proposals WHERE org_id = $1 AND status = 'approved'`,
        [orgId]
      ),
      client.query(
        `SELECT COUNT(*)::int AS total FROM ai_action_proposals WHERE org_id = $1 AND status = 'rejected'`,
        [orgId]
      ),
      client.query(
        `SELECT COALESCE(SUM(cost_usd), 0)::float AS total_cost FROM ai_usage WHERE org_id = $1`,
        [orgId]
      ),
      client.query(
        `SELECT COALESCE(AVG(response_time_minutes), 0)::float AS avg_response FROM tickets WHERE org_id = $1 AND deleted_at IS NULL`,
        [orgId]
      ),
    ]);

    const totalTickets = ticketsRes.rows[0]?.total || 0;
    const aiResolved = aiResolvedRes.rows[0]?.total || 0;
    const humanResolved = humanResolvedRes.rows[0]?.total || 0;
    const totalAISpend = parseFloat(spendRes.rows[0]?.total_cost || 0);
    const avgResponseTime = Math.round(parseFloat(avgResponseRes.rows[0]?.avg_response || 0));

    const aiResolutionRate = totalTickets === 0 ? 0 : Math.round((aiResolved / totalTickets) * 100);

    return reply.code(200).send({
      totalTickets,
      aiResolved,
      humanResolved,
      aiResolutionRate,
      avgResponseTime,
      totalAISpend: parseFloat(totalAISpend.toFixed(4)),
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "Failed to calculate organization analytics metrics",
    });
  } finally {
    client.release();
  }
}

export default {
  getOrgAnalytics,
};