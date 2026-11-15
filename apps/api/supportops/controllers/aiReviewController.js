import { prisma } from "../lib/deps.js";

export async function listPending(request, reply) {
  const orgId = request.access?.org?.id;
  if (!orgId) return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_ACCESS_DENIED" });
  const proposals = await prisma.aIActionProposal.findMany({
    where: { org_id: orgId, status: "pending" },
    include: { ticket: { select: { id: true, number: true, subject: true, priority: true, status: true } } },
    orderBy: { created_at: "desc" }, take: 100,
  });
  return proposals.map((p) => ({
    id: p.id, ticketId: p.ticket_id, ticket: p.ticket, actionType: p.action_type,
    summary: p.summary, draftReply: p.payload?.draft_reply || "",
    confidence: p.confidence_score, riskLevel: p.risk_level, status: p.status, createdAt: p.created_at,
  }));
}

export async function reviewProposal(request, reply) {
  const orgId = request.access?.org?.id;
  const reviewerId = request.access?.user?.id;
  const { id } = request.params;
  const { decision, finalReply, rejectionReason } = request.body || {};
  if (!orgId || !reviewerId) return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_ACCESS_DENIED" });
  if (!["approved", "rejected", "edited"].includes(decision)) return reply.code(400).send({ error: "INVALID_REVIEW_DECISION" });
  if (decision === "edited" && (typeof finalReply !== "string" || !finalReply.trim() || finalReply.length > 4000)) {
    return reply.code(400).send({ error: "INVALID_FINAL_REPLY", message: "An edited reply must contain 1 to 4000 characters." });
  }
  const proposal = await prisma.aIActionProposal.findFirst({ where: { id, org_id: orgId, status: "pending" } });
  if (!proposal) return reply.code(404).send({ error: "PROPOSAL_NOT_FOUND_OR_ALREADY_REVIEWED" });
  const payload = { ...(proposal.payload || {}), ...(finalReply ? { final_reply: finalReply.trim() } : {}) };
  const updated = await prisma.aIActionProposal.updateMany({
    where: { id, org_id: orgId, status: "pending" },
    data: { status: decision, payload, reviewed_by: reviewerId, reviewed_at: new Date(), rejection_reason: decision === "rejected" ? String(rejectionReason || "").slice(0, 1000) || null : null },
  });
  if (!updated.count) return reply.code(409).send({ error: "PROPOSAL_ALREADY_REVIEWED" });
  return { success: true, proposalId: id, decision, sentToCustomer: false, message: decision === "rejected" ? "Draft rejected." : "Draft approved and saved. Sending remains a separate agent action." };
}

export default { listPending, reviewProposal };
