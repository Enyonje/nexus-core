/**
 * Organization Analytics Controller
 * Path: supportops/controllers/orgAnalyticsController.js
 */

import { Ticket } from "../models/Ticket.js";
import { AIUsage } from "../models/AIUsage.js";
import { AIActionProposal } from "../models/AIActionProposal.js";

/**
 * Retrieves high-level support, AI resolution, and spend metrics for an organization.
 * Compatible with Fastify + PostgreSQL (pg).
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function getOrgAnalytics(request, reply) {
  // Extract organization ID from attached authenticated user context
  const orgId = request.currentUser?.org_id || request.user?.orgId || request.user?.org_id;
  const pg = request.server.pg;

  if (!orgId) {
    return reply.code(400).send({
      error: "BAD_REQUEST",
      message: "Organization context (org_id) is missing from request context",
    });
  }

  const client = await pg.connect();

  try {
    // 1. Fetch total non-deleted tickets for the organization
    const ticketsRes = await client.query(
      `SELECT COUNT(*)::int AS total 
       FROM tickets 
       WHERE org_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    const totalTickets = ticketsRes.rows[0]?.total || 0;

    // 2. Fetch approved AI proposals (AI resolutions)
    const aiResolvedRes = await client.query(
      `SELECT COUNT(*)::int AS total 
       FROM ai_action_proposals 
       WHERE org_id = $1 AND status = 'approved'`,
      [orgId]
    );
    const aiResolved = aiResolvedRes.rows[0]?.total || 0;

    // 3. Fetch rejected AI proposals (fallback to human resolution)
    const humanResolvedRes = await client.query(
      `SELECT COUNT(*)::int AS total 
       FROM ai_action_proposals 
       WHERE org_id = $1 AND status = 'rejected'`,
      [orgId]
    );
    const humanResolved = humanResolvedRes.rows[0]?.total || 0;

    // 4. Aggregate total AI spend (USD) from usage logs
    const spendRes = await client.query(
      `SELECT COALESCE(SUM(cost_usd), 0)::float AS total_cost 
       FROM ai_usage 
       WHERE org_id = $1`,
      [orgId]
    );
    const totalAISpend = parseFloat(spendRes.rows[0]?.total_cost || 0);

    // 5. Calculate average ticket response time (in minutes)
    const avgResponseRes = await client.query(
      `SELECT COALESCE(AVG(response_time_minutes), 0)::float AS avg_response 
       FROM tickets 
       WHERE org_id = $1 AND deleted_at IS NULL`,
      [orgId]
    );
    const avgResponseTime = Math.round(parseFloat(avgResponseRes.rows[0]?.avg_response || 0));

    // Calculate AI resolution percentage
    const aiResolutionRate = totalTickets === 0
      ? 0
      : Math.round((aiResolved / totalTickets) * 100);

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