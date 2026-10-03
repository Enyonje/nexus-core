import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      index: true,
      required: true
    },
    metric: {
      type: String,
      enum: ["ai_resolution", "workflow_run", "incident"],
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    reported: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("Usage", usageSchema);
