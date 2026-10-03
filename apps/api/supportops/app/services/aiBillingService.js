import AIUsage from "../models/AIUsage.js";
import { AI_PRICING, PLAN_LIMITS } from "../config/aiLimits.js";

export async function checkAILimit(orgId, plan) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await AIUsage.aggregate([
    {
      $match: {
        orgId,
        createdAt: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$costUSD" }
      }
    }
  ]);

  const spent = usage[0]?.total || 0;
  const limit = PLAN_LIMITS[plan].monthlyUSD;

  if (spent >= limit) {
    throw new Error("AI monthly limit exceeded");
  }

  return { spent, limit };
}

export function calculateCost({
  model,
  promptTokens,
  completionTokens
}) {
  const pricing = AI_PRICING[model];

  const inputCost = promptTokens * pricing.input;
  const outputCost = completionTokens * pricing.output;

  return {
    totalTokens: promptTokens + completionTokens,
    costUSD: Number((inputCost + outputCost).toFixed(6))
  };
}
