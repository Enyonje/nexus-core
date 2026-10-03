import mongoose from "mongoose";

const AIPromptMetricSchema = new mongoose.Schema(
  {
    promptVersion: String,
    ticketId: String,
    action: String,
    confidence: Number,
    autoResolved: Boolean
  },
  { timestamps: true }
);

export default mongoose.model(
  "AIPromptMetric",
  AIPromptMetricSchema
);
