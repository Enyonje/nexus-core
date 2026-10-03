import mongoose from "mongoose";

const aiUsageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      required: true
    },
    month: {
      type: String, // YYYY-MM
      index: true
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    requests: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

aiUsageSchema.index({ tenantId: 1, month: 1 }, { unique: true });

export default mongoose.model("AIUsage", aiUsageSchema);
