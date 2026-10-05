/**
 * AI Decision Controller
 * Path: supportops/controllers/aiDecisionController.js
 */

import AIActionProposal from "../models/AIActionProposal.js";
import HallucinationLog from "../models/HallucinationLog.js";
import { analyzeAIResponse } from "../services/hallucinationDetector.js";

/**
 * Extracts normalized user ID and org ID from Fastify entitlement context or request
 */
function getAuthContext(request) {
  const userId =
    request.access?.user?.id ||
    request.currentUser?.id ||
    request.user?.sub ||
    request.user?.id;

  const orgId =
    request.access?.org?.id ||
    request.currentUser?.org_id ||
    request.user?.org_id ||
    null;

  return { userId, orgId };
}

/**
 * Evaluates AI response for hallucination risks and logs/proposes downstream action
 */
export async function proposeAIAction(request, reply) {
  const {
    ticketId,
    aiResponse,
    confidenceScore,
    citedSources,
  } = request.body || {};

  const { userId, orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  if (!ticketId || !aiResponse) {
    return reply.code(400).send({
      error: "BAD_REQUEST",
      message: "Missing required fields: ticketId and aiResponse are required.",
    });
  }

  try {
    const analysis = analyzeAIResponse({
      aiResponse,
      confidenceScore,
      citedSources,
    });

    const isBlocked = Boolean(analysis.isHallucinationRisk);

    const proposal = await AIActionProposal.create(db, {
      ticketId,
      orgId,
      userId,
      action: aiResponse,
      ai_confidence: confidenceScore,
      status: isBlocked ? "blocked" : "pending",
    });

    await HallucinationLog.create(db, {
      ticketId,
      orgId,
      userId,
      aiResponse,
      confidenceScore,
      riskScore: analysis.riskScore,
      flags: analysis.flags,
      autoBlocked: isBlocked,
    });

    return reply.code(200).send({
      success: true,
      proposalId: proposal.id || proposal._id,
      blocked: isBlocked,
      flags: analysis.flags,
      riskScore: analysis.riskScore,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to process AI action proposal",
    });
  }
}

// Default export container
export default {
  proposeAIAction,
};