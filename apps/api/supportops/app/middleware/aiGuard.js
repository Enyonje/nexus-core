import { enforceAIBudget } from "../services/aiCostGovernor.js";

export default async function aiGuard(req, res, next) {
  const estimatedTokens = req.body.estimatedTokens || 500;

  const result = await enforceAIBudget(
    req.tenantId,
    estimatedTokens
  );

  if (!result.allowed) {
    return res.status(429).json({
      error: "AI usage limit reached",
      upgradeRequired: true
    });
  }

  req.aiUsage = result.usage;
  req.aiWarn = result.warn;

  next();
}
