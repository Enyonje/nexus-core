import mongoose from "mongoose";

const tenantSchema = new mongoose.Schema(
  {
    name: String,
    domain: String,
    plan: { type: String, default: "free" },

    aiBudget: {
      monthlyTokens: { type: Number, default: 100000 },
      softLimit: { type: Number, default: 80000 },
      hardLimit: { type: Number, default: 100000 }
    },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Tenant", tenantSchema);
