import AIActionProposal from "../models/AIActionProposal.js";

export async function listPending(req, res) {
  const proposals = await AIActionProposal.find({
    status: "pending"
  }).sort({ createdAt: -1 });

  res.json(proposals);
}

export async function reviewProposal(req, res) {
  const { id } = req.params;
  const { decision, finalReply } = req.body;

  const proposal = await AIActionProposal.findById(id);
  if (!proposal) {
    return res.status(404).json({ error: "Not found" });
  }

  proposal.status = decision;
  proposal.finalReply =
    finalReply || proposal.aiReply;
  proposal.reviewedBy = req.user?.id || "admin";
  proposal.reviewedAt = new Date();

  await proposal.save();

  res.json({ success: true });
}
