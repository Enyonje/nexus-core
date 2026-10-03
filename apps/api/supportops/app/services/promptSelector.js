import AIPrompt from "../models/AIPrompt.js";

export async function selectPromptVersion() {
  const prompts = await AIPrompt.find({ active: true });

  const weighted = [];
  prompts.forEach(p => {
    for (let i = 0; i < p.weight; i++) {
      weighted.push(p);
    }
  });

  if (weighted.length === 0) {
    throw new Error("No active AI prompts found");
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
