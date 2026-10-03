import { recordAIUsage } from "../services/aiCostGovernor.js";

export async function runAIWorkflow(req, res) {
  // Simulated AI response
  const tokensUsed = Math.floor(Math.random() * 800) + 200;

  if (req.aiUsage) {
    await recordAIUsage(req.aiUsage, tokensUsed);
  }

  res.json({
    result: "AI analysis complete",
    tokensUsed,
    warning: req.aiWarn || false
  });
}
