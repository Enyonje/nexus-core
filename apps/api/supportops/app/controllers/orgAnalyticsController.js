import Ticket from "../models/Ticket.js";
import AIUsage from "../models/AIUsage.js";
import AIActionProposal from "../models/AIActionProposal.js";

export async function getOrgAnalytics(req, res) {
  const orgId = req.user.orgId;

  const totalTickets = await Ticket.countDocuments({ orgId });

  const aiResolved = await AIActionProposal.countDocuments({
    status: "approved"
  });

  const humanResolved = await AIActionProposal.countDocuments({
    status: "rejected"
  });

  const aiSpendAgg = await AIUsage.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: null,
        totalCost: { $sum: "$costUSD" }
      }
    }
  ]);

  const avgResponseAgg = await Ticket.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: null,
        avgResponse: { $avg: "$responseTimeMinutes" }
      }
    }
  ]);

  res.json({
    totalTickets,
    aiResolved,
    humanResolved,
    aiResolutionRate:
      totalTickets === 0
        ? 0
        : Math.round((aiResolved / totalTickets) * 100),
    avgResponseTime:
      avgResponseAgg[0]?.avgResponse || 0,
    totalAISpend:
      aiSpendAgg[0]?.totalCost || 0
  });
}
