/**
 * AI Review / Human-in-the-Loop Controller
 * Path: supportops/controllers/aiReviewController.js
 */

import { AIActionProposal } from "../models/AIActionProposal.js";

/**
 * Extracts normalized user ID and org ID from Fastify entitlement context or request
 */
function getAuthContext(request) {
  const userId =
    request.access?.user?.id ||
    request.currentUser?.id ||
    request.user?.sub ||
    request.user?.id ||
    "admin";

  const orgId =
    request.access?.org?.id ||
    request.currentUser?.org_id ||
    request.user?.org_id ||
    null;

  return { userId, orgId };
}

/**
 * Retrieves all pending AI action proposals filtered by organization context
 */
export async function listPending(request, reply) {
  const { orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  try {
    let proposals;

    // Handle Mongoose ORM model
    if (typeof AIActionProposal.find === "function") {
      const filter = { status: "pending", ...(orgId ? { org_id: orgId } : {}) };
      proposals = await AIActionProposal.find(filter).sort({ createdAt: -1 });
    }
    // Fallback for direct Prisma/PG static helper
    else if (typeof AIActionProposal.findPending === "function") {
      proposals = await AIActionProposal.findPending(db, orgId);
    } else {
      proposals = [];
    }

    return reply.code(200).send(proposals);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to retrieve pending AI action proposals",
    });
  }
}

/**
 * Approves, rejects, or edits a pending AI action proposal
 */
export async function reviewProposal(request, reply) {
  const { id } = request.params;
  const { decision, finalReply } = request.body || {};
  const { userId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  if (!id || !decision) {
    return reply.code(400).send({
      error: "BAD_REQUEST",
      message: "Proposal ID and decision ('approved' | 'rejected') are required.",
    });
  }

  try {
    // Handle Mongoose ORM document
    if (typeof AIActionProposal.findById === "function") {
      const proposal = await AIActionProposal.findById(id);
      if (!proposal) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `AI action proposal with ID ${id} was not found`,
        });
      }

      proposal.status = decision;
      proposal.finalReply = finalReply || proposal.aiReply || proposal.action;
      proposal.reviewedBy = userId;
      proposal.reviewedAt = new Date();

      await proposal.save();
    }
    // Fallback for direct Prisma/PG static update helper
    else if (typeof AIActionProposal.updateReview === "function") {
      const updated = await AIActionProposal.updateReview(db, id, {
        decision,
        finalReply,
        reviewedBy: userId,
      });

      if (!updated) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `AI action proposal with ID ${id} was not found`,
        });
      }
    }

    return reply.code(200).send({
      success: true,
      proposalId: id,
      decision,
    });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to update proposal review decision",
    });
  }
}

// Default export container
export default {
  listPending,
  reviewProposal,
};