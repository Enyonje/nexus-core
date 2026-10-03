import mongoose from "mongoose";

const hallucinationLogSchema = new mongoose.Schema(
  {
    ticketId: String,
    aiResponse: String,
    confidenceScore: Number,
    riskScore: Number,
    flags: [String],
    autoBlocked: Boolean
  },
  { timestamps: true }
);

export default mongoose.model(
  "HallucinationLog",
  hallucinationLogSchema
);
