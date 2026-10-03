import AIUsage from "../models/AIUsage.js";
import Tenant from "../models/Tenant.js";

export async function enforceAIBudget(tenantId, tokensRequested) {
  const month = new Date().toISOString().slice(0, 7);

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const usage =
    (await AIUsage.findOne({ tenantId, month })) ||
    (await AIUsage.create({ tenantId, month }));

  const projected = usage.tokensUsed + tokensRequested;

  if (projected >= tenant.aiBudget.hardLimit) {
    return {
      allowed: false,
      reason: "AI hard limit exceeded"
    };
  }

  return {
    allowed: true,
    warn: projected >= tenant.aiBudget.softLimit,
    usage,
    tenant
  };
}

export async function recordAIUsage(usage, tokens) {
  usage.tokensUsed += tokens;
  usage.requests += 1;
  await usage.save();
}
