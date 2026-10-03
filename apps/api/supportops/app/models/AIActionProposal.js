import mongoose from "mongoose";

const AIActionProposalSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true
    },
    promptVersion: String,

    aiReply: String,
    suggestedAction: String,
    confidence: Number,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },

    reviewedBy: String,
    reviewedAt: Date,
    finalReply: String
  },
  { timestamps: true }
);

export default mongoose.model(
  "AIActionProposal",
  AIActionProposalSchema
);
