import mongoose from "mongoose";

const incidentSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      required: true
    },
    title: String,
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low"
    },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved"],
      default: "open"
    },
    source: {
      type: String,
      enum: ["ai", "human", "system"],
      default: "system"
    },
    timeline: [
      {
        message: String,
        actor: String,
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Incident", incidentSchema);
