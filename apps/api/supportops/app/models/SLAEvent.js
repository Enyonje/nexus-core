import mongoose from "mongoose";

const slaEventSchema = new mongoose.Schema(
  {
    ticketId: String,
    riskScore: Number,
    status: String,
    priority: String,
    backlogSize: Number
  },
  { timestamps: true }
);

export default mongoose.model("SLAEvent", slaEventSchema);
