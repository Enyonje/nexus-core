/**
 * AI Cost Governor & Token Budget Enforcement Service
 * Path: services/aiCostGovernor.js
 */

import { AIUsage, MODEL_RATES } from "../models/AIUsage.js";

// Monthly AI budget caps in USD by subscription tier
const TIER_BUDGETS_USD = {
    free: 2.0,         // $2 limit / month
    pro: 50.00,        // $50 limit / month
    enterprise: 500.0, // $500 limit / month
};

/**
 * Standalone export function to resolve import error in controllers/aiController.js
 * Records usage directly without budget enforcement.
 */
export async function recordAIUsage(pg, usageData) {
    return await AICostGovernor.recordUsage(pg, usageData);
}

/**
 * Enforces budget before recording usage.
 * Throws if the user/org has exceeded their monthly cap.
 */
export async function enforceAIBudget(pg, usageData) {
    const { userId, orgId } = usageData;
    const budget = await AICostGovernor.checkBudget(pg, userId, orgId);

    if (!budget.allowed) {
        throw new Error(
            `AI_BUDGET_EXCEEDED: Tier=${budget.tier}, Limit=${budget.limit}, Current=${budget.currentSpend}`
        );
    }

    return await AICostGovernor.recordUsage(pg, usageData);
}

export class AICostGovernor {
    static calculateCost(model, promptTokens = 0, completionTokens = 0) {
        const rates = MODEL_RATES[model] || MODEL_RATES.default;
        const promptCost = (promptTokens / 1000) * rates.prompt;
        const completionCost = (completionTokens / 1000) * rates.completion;
        return parseFloat((promptCost + completionCost).toFixed(6));
    }

    static async checkBudget(pg, userId, orgId = null) {
        const client = await pg.connect();
        try {
            const userRes = await client.query(
                `SELECT subscription, ai_used FROM users WHERE id = $1 AND deleted_at IS NULL`,
                [userId]
            );

            if (userRes.rows.length === 0) {
                throw new Error("USER_NOT_FOUND");
            }

            const user = userRes.rows[0];
            const tier = user.subscription || "free";
            const monthlyCap = TIER_BUDGETS_USD[tier] || TIER_BUDGETS_USD.free;

            const monthlySummary = await AIUsage.getMonthlySummary(pg, { userId, orgId });
            const currentSpend = monthlySummary.totalCostUsd;
            const allowed = currentSpend < monthlyCap;

            return {
                allowed,
                currentSpend,
                limit: monthlyCap,
                remaining: Math.max(0, parseFloat((monthlyCap - currentSpend).toFixed(4))),
                tier,
            };
        } finally {
            client.release();
        }
    }

    static async recordUsage(pg, {
        userId,
        executionId = null,
        ticketId = null,
        model = "gpt-4o-mini",
        promptTokens = 0,
        completionTokens = 0,
        orgId = null,
        provider = "openai",
        metadata = {}
    }) {
        const totalTokens = promptTokens + completionTokens;
        const client = await pg.connect();

        try {
            await client.query("BEGIN");

            await client.query(
                `UPDATE users SET ai_used = COALESCE(ai_used, 0) + $1 WHERE id = $2`,
                [totalTokens, userId]
            );

            const usageRecord = await AIUsage.record(client, {
                userId,
                orgId,
                executionId,
                ticketId,
                provider,
                model,
                promptTokens,
                completionTokens,
                metadata,
            });

            if (executionId) {
                await client.query(
                    `INSERT INTO execution_steps 
                     (execution_id, user_id, org_id, name, step_type, status, output)
                     VALUES ($1, $2, $3, $4, 'ai_completion', 'completed', $5)`,
                    [
                        executionId,
                        userId,
                        orgId,
                        `AI Request (${model})`,
                        JSON.stringify({
                            model,
                            promptTokens,
                            completionTokens,
                            totalTokens,
                            cost_usd: usageRecord.costUsd,
                        }),
                    ]
                );
            }

            await client.query("COMMIT");
            return usageRecord;
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }
    }
}
