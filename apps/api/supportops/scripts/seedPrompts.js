import mongoose from "mongoose";
import AIPrompt from "../models/AIPrompt.js";

mongoose.connect(process.env.MONGO_URI);

async function seed() {
  await AIPrompt.deleteMany();

  await AIPrompt.insertMany([
    {
      name: "Default",
      version: "v1",
      weight: 7,
      systemPrompt: `
You are SupportOps AI.
Be concise, professional, and prioritize auto-resolution.
Respond in JSON with reply, action, confidence.
`
    },
    {
      name: "Experimental",
      version: "v2",
      weight: 3,
      systemPrompt: `
You are SupportOps AI.
Optimize for customer satisfaction and clarity.
Respond in JSON with reply, action, confidence.
`
    }
  ]);

  console.log("Prompts seeded");
  process.exit();
}

seed();
