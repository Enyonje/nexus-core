import mongoose from "mongoose";

const AIPromptSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    systemPrompt: {
      type: String,
      required: true
    },
    weight: {
      type: Number,
      default: 1
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("AIPrompt", AIPromptSchema);
