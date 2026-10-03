import Ticket from "../models/Ticket.js";
import SLAEvent from "../models/SLAEvent.js";
import { predictSLARisk } from "../services/slaPredictor.js";

export async function getTickets(req, res) {
  const tickets = await Ticket.find({
    tenantId: req.tenantId
  }).sort({ createdAt: -1 });

  const backlogSize = tickets.filter(
    t => t.status !== "Resolved"
  ).length;

  const enriched = await Promise.all(
    tickets.map(async ticket => {
      const ageMinutes =
        (Date.now() - ticket.createdAt.getTime()) / 60000;

      const prediction = predictSLARisk({
        ticketAgeMinutes: ageMinutes,
        priority: ticket.priority,
        avgResolutionMinutes: 180,
        backlogSize,
        aiConfidence: ticket.ai_confidence || 0.8
      });

      await SLAEvent.create({
        ticketId: ticket.id,
        tenantId: req.tenantId,
        riskScore: prediction.slaRiskScore,
        status: prediction.slaStatus,
        priority: ticket.priority,
        backlogSize
      });

      return {
        ...ticket.toObject(),
        slaRiskScore: prediction.slaRiskScore,
        slaStatus: prediction.slaStatus
      };
    })
  );

  res.json(enriched);
}
