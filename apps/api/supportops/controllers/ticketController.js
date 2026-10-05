/**
 * Ticket List & SLA Risk Prediction Controller
 * Path: supportops/controllers/ticketSlaController.js
 */

import { Ticket } from "../models/Ticket.js";
import { SLAEvent } from "../models/SLAEvent.js";
import { predictSLARisk } from "../services/slaPredictor.js";

/**
 * Extracts normalized organization/tenant context from Fastify request
 */
function getAuthContext(request) {
  const orgId =
    request.access?.org?.id ||
    request.tenantId ||
    request.currentUser?.org_id ||
    request.user?.orgId ||
    request.user?.org_id ||
    null;

  return { orgId };
}

/**
 * Fetches tickets, predicts SLA breach risks, logs SLA metrics, and returns enriched ticket objects.
 * 
 * @param {import('fastify').FastifyRequest} request
 * @param {import('fastify').FastifyReply} reply
 */
export async function getTickets(request, reply) {
  const { orgId } = getAuthContext(request);
  const prisma = request.server.prisma;
  const pg = request.server.pg;

  if (!orgId) {
    return reply.code(400).send({
      error: "MISSING_ORG_CONTEXT",
      message: "Organization ID or tenant context could not be determined",
    });
  }

  try {
    let tickets = [];

    // 1. Fetch tickets across supported ORM / Database layers
    if (typeof Ticket.find === "function") {
      // Mongoose / MongoDB ORM
      tickets = await Ticket.find({
        $or: [{ tenantId: orgId }, { org_id: orgId }],
      }).sort({ createdAt: -1 });
    } else if (prisma && typeof prisma.ticket.findMany === "function") {
      // Prisma ORM
      tickets = await prisma.ticket.findMany({
        where: {
          OR: [{ tenant_id: orgId }, { org_id: orgId }],
        },
        orderBy: { created_at: "desc" },
      });
    } else if (pg) {
      // Direct fastify-postgres client
      const client = await pg.connect();
      try {
        const res = await client.query(
          `SELECT * FROM tickets WHERE org_id = $1 OR tenant_id = $1 ORDER BY created_at DESC`,
          [orgId]
        );
        tickets = res.rows;
      } finally {
        client.release();
      }
    }

    // 2. Compute backlog size (unresolved tickets)
    const backlogSize = tickets.filter(
      (t) => (t.status || "").toLowerCase() !== "resolved"
    ).length;

    const slaEventsToCreate = [];

    // 3. Enrich tickets with SLA Risk Predictions
    const enriched = tickets.map((ticket) => {
      const ticketObj = typeof ticket.toObject === "function" ? ticket.toObject() : { ...ticket };

      const createdAtDate = ticket.createdAt || ticket.created_at
        ? new Date(ticket.createdAt || ticket.created_at)
        : new Date();

      const ageMinutes = Math.max(0, (Date.now() - createdAtDate.getTime()) / 60000);

      const prediction = predictSLARisk({
        ticketAgeMinutes: ageMinutes,
        priority: ticket.priority || "Medium",
        avgResolutionMinutes: 180,
        backlogSize,
        aiConfidence: ticket.ai_confidence ?? ticket.aiConfidence ?? 0.8,
      });

      const ticketId = ticket.id || ticket._id;

      slaEventsToCreate.push({
        ticketId,
        tenantId: orgId,
        org_id: orgId,
        riskScore: prediction.slaRiskScore,
        status: prediction.slaStatus,
        priority: ticket.priority || "Medium",
        backlogSize,
      });

      return {
        ...ticketObj,
        slaRiskScore: prediction.slaRiskScore,
        slaStatus: prediction.slaStatus,
      };
    });

    // 4. Async SLA Event Logging (Non-blocking batch execution)
    if (slaEventsToCreate.length > 0) {
      (async () => {
        try {
          if (typeof SLAEvent.insertMany === "function") {
            await SLAEvent.insertMany(slaEventsToCreate);
          } else if (typeof SLAEvent.create === "function") {
            await Promise.all(
              slaEventsToCreate.map((evt) => SLAEvent.create(evt))
            );
          } else if (prisma && typeof prisma.sLAEvent?.createMany === "function") {
            await prisma.sLAEvent.createMany({
              data: slaEventsToCreate.map((evt) => ({
                ticket_id: String(evt.ticketId),
                org_id: evt.org_id,
                risk_score: evt.riskScore,
                status: evt.status,
                priority: evt.priority,
                backlog_size: evt.backlogSize,
              })),
            });
          }
        } catch (eventErr) {
          request.log.warn({ error: eventErr }, "SLA Event background logging failed");
        }
      })();
    }

    return reply.code(200).send(enriched);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to retrieve and evaluate ticket SLA risk",
    });
  }
}

export default {
  getTickets,
};