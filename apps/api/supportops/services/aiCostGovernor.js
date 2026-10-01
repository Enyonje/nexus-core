/**
 * AI Cost Governor & Token Budget Enforcement Service
 * Path: services/aiCostGovernor.js
 */

import { AIUsage, MODEL_RATES } from "../models/AIUsage.js";

// Monthly AI budget caps in USD by subscription tier
const TIER_BUDGETS_USD = {
    free: 2.0,        // $2 limit / month
    pro: 50.00,       // $50 limit / month
    enterprise: 500.0, // $500 limit / month
};

/**
 * Standalone export function to resolve import error in controllers/aiController.js
 * 
 * @param {object} pg - Fastify PostgreSQL client/pool
 * @param {object} usageData - Usage details (userId, executionId, model, promptTokens, completionTokens, etc.)
 * @returns {Promise<AIUsage>}
 */
export async function recordAIUsage(pg, usageData) {
    return await AICostGovernor.recordUsage(pg, usageData);
}

export class AICostGovernor {
    /**
     * Calculates the USD cost for an AI completion request using MODEL_RATES from AIUsage model.
     * 
     * @param {string} model - AI model identifier
     * @param {number} promptTokens - Input tokens used
     * @param {number} completionTokens - Output tokens used
     * @returns {number} Estimated cost in USD
     */
    static calculateCost(model, promptTokens = 0, completionTokens = 0) {
        const rates = MODEL_RATES[model] || MODEL_RATES.default;
        const promptCost = (promptTokens / 1000) * rates.prompt;
        const completionCost = (completionTokens / 1000) * rates.completion;

        return parseFloat((promptCost + completionCost).toFixed(6));
    }

    /**
     * Checks if a user or organization has remaining AI budget for the current billing month.
     * 
     * @param {object} pg - Fastify PostgreSQL client
     * @param {string|number} userId - User ID
     * @param {string|number} [orgId] - Optional Organization ID
     * @returns {Promise<{ allowed: boolean, currentSpend: number, limit: number, remaining: number, tier: string }>}
     */
    static async checkBudget(pg, userId, orgId = null) {
        const client = await pg.connect();
        try {
            // 1. Get user details and subscription tier
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

            // 2. Query aggregated spend for current month via AIUsage model
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

    /**
     * Tracks and records AI usage metrics to the database.
     * Updates user total token count, logs entry in `ai_usage`, and optionally creates `execution_steps`.
     * 
     * @param {object} pg - Fastify PostgreSQL client
     * @param {object} params
     * @param {string|number} params.userId - User ID
     * @param {string} [params.executionId] - Execution run ID
     * @param {string|number} [params.ticketId] - Ticket ID
     * @param {string} params.model - Model used
     * @param {number} params.promptTokens - Prompt token count
     * @param {number} params.completionTokens - Completion token count
     * @param {string|number} [params.orgId] - Optional Organization ID
     * @param {string} [params.provider="openai"] - Provider identifier
     * @param {object} [params.metadata={}] - Additional metadata
     * @returns {Promise<AIUsage>}
     */
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

            // 1. Increment total AI usage token count on User record
            await client.query(
                `UPDATE users SET ai_used = COALESCE(ai_used, 0) + $1 WHERE id = $2`,
                [totalTokens, userId]
            );

            // 2. Persist granular log via AIUsage model
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

            // 3. Log step metadata to execution_steps table if part of an agent execution workflow
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