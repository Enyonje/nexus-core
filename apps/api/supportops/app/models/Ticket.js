import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true
    },
    subject: String,
    summary: String,
    status: String,
    priority: String,
    ai_confidence: Number
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
