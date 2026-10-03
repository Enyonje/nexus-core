import AIActionProposal from "../models/AIActionProposal.js";
import HallucinationLog from "../models/HallucinationLog.js";
import { analyzeAIResponse } from "../services/hallucinationDetector.js";

export async function proposeAIAction(req, res) {
  const {
    ticketId,
    aiResponse,
    confidenceScore,
    citedSources
  } = req.body;

  const analysis = analyzeAIResponse({
    aiResponse,
    confidenceScore,
    citedSources
  });

  const proposal = await AIActionProposal.create({
    ticketId,
    action: aiResponse,
    ai_confidence: confidenceScore,
    status: analysis.isHallucinationRisk
      ? "blocked"
      : "pending"
  });

  await HallucinationLog.create({
    ticketId,
    aiResponse,
    confidenceScore,
    riskScore: analysis.riskScore,
    flags: analysis.flags,
    autoBlocked: analysis.isHallucinationRisk
  });

  res.json({
    proposalId: proposal._id,
    blocked: analysis.isHallucinationRisk,
    flags: analysis.flags,
    riskScore: analysis.riskScore
  });
}
