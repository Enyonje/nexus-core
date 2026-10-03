/**
 * AI Usage Data Model & Database Helpers
 * Path: models/AIUsage.js
 * 
 * Tracks token consumption, financial cost (USD), model metrics,
 * and execution linkages for AI agent operations.
 */

// Cost per 1,000 tokens in USD
export const MODEL_RATES = {
    "gpt-4o": { prompt: 0.0025, completion: 0.01 },
    "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
    "claude-3-5-sonnet": { prompt: 0.003, completion: 0.015 },
    "claude-3-haiku": { prompt: 0.00025, completion: 0.0012 },
    default: { prompt: 0.0015, completion: 0.002 },
};

export class AIUsage {
    /**
     * Constructs an AIUsage instance
     * @param {Object} data 
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.userId = data.userId || data.user_id || null;
        this.orgId = data.orgId || data.org_id || null;
        this.executionId = data.executionId || data.execution_id || null;
        this.ticketId = data.ticketId || data.ticket_id || null;

        // AI Provider & Model details
        this.provider = data.provider || "openai";
        this.model = data.model || "gpt-4o-mini";

        // Token metrics
        this.promptTokens = data.promptTokens ?? data.prompt_tokens ?? 0;
        this.completionTokens = data.completionTokens ?? data.completion_tokens ?? 0;
        this.totalTokens = this.promptTokens + this.completionTokens;

        // Cost calculation (USD)
        this.costUsd = data.costUsd ?? data.cost_usd ?? this.calculateCost();

        // Additional execution context
        this.metadata = data.metadata || {};

        // Timestamps
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    /**
     * Calculates total estimated cost in USD based on input model rates
     * @returns {number} Estimated USD cost
     */
    calculateCost() {
        const rates = MODEL_RATES[this.model] || MODEL_RATES.default;
        const promptCost = (this.promptTokens / 1000) * rates.prompt;
        const completionCost = (this.completionTokens / 1000) * rates.completion;
        return parseFloat((promptCost + completionCost).toFixed(6));
    }

    /**
     * Helper: Map PostgreSQL database row to AIUsage model instance
     * @param {Object} row 
     * @returns {AIUsage}
     */
    static fromRow(row) {
        if (!row) return null;
        return new AIUsage({
            id: row.id,
            userId: row.user_id,
            orgId: row.org_id,
            executionId: row.execution_id,
            ticketId: row.ticket_id,
            provider: row.provider,
            model: row.model,
            promptTokens: parseInt(row.prompt_tokens, 10),
            completionTokens: parseInt(row.completion_tokens, 10),
            costUsd: parseFloat(row.cost_usd),
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            createdAt: row.created_at,
        });
    }

    /**
     * Insert new AI usage log into PostgreSQL
     * @param {Object} pg - Fastify PostgreSQL pool/client
     * @param {Object} usageData 
     * @returns {Promise<AIUsage>}
     */
    static async record(pg, usageData) {
        const usage = new AIUsage(usageData);
        const client = await pg.connect();

        try {
            const query = `
          INSERT INTO ai_usage (
            user_id, org_id, execution_id, ticket_id,
            provider, model, prompt_tokens, completion_tokens,
            total_tokens, cost_usd, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *;
        `;

            const values = [
                usage.userId,
                usage.orgId,
                usage.executionId,
                usage.ticketId,
                usage.provider,
                usage.model,
                usage.promptTokens,
                usage.completionTokens,
                usage.totalTokens,
                usage.costUsd,
                JSON.stringify(usage.metadata),
            ];

            const res = await client.query(query, values);
            return AIUsage.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Retrieve monthly AI usage metrics and aggregated cost for a specific user or organization
     * @param {Object} pg 
     * @param {Object} options
     * @param {number|string} [options.userId] 
     * @param {number|string} [options.orgId] 
     * @returns {Promise<{ totalTokens: number, totalCostUsd: number, requestCount: number }>}
     */
    static async getMonthlySummary(pg, { userId = null, orgId = null }) {
        const client = await pg.connect();
        try {
            let query = `
          SELECT 
            COALESCE(SUM(total_tokens), 0) as total_tokens,
            COALESCE(SUM(cost_usd), 0) as total_cost_usd,
            COUNT(id) as request_count
          FROM ai_usage
          WHERE created_at >= date_trunc('month', CURRENT_TIMESTAMP)
        `;
            const params = [];

            if (userId) {
                params.push(userId);
                query += ` AND user_id = $${params.length}`;
            }

            if (orgId) {
                params.push(orgId);
                query += ` AND org_id = $${params.length}`;
            }

            const res = await client.query(query, params);
            const row = res.rows[0];

            return {
                totalTokens: parseInt(row.total_tokens, 10),
                totalCostUsd: parseFloat(parseFloat(row.total_cost_usd).toFixed(4)),
                requestCount: parseInt(row.request_count, 10),
            };
        } finally {
            client.release();
        }
    }

    /**
     * Fetch recent usage logs with optional filtering
     * @param {Object} pg 
     * @param {Object} options 
     * @param {number|string} [options.userId] 
     * @param {number|string} [options.orgId] 
     * @param {number} [options.limit=50] 
     * @returns {Promise<AIUsage[]>}
     */
    static async findRecent(pg, { userId = null, orgId = null, limit = 50 } = {}) {
        const client = await pg.connect();
        try {
            let query = "SELECT * FROM ai_usage WHERE 1=1";
            const params = [];

            if (userId) {
                params.push(userId);
                query += ` AND user_id = $${params.length}`;
            }

            if (orgId) {
                params.push(orgId);
                query += ` AND org_id = $${params.length}`;
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
            params.push(limit);

            const res = await client.query(query, params);
            return res.rows.map((row) => AIUsage.fromRow(row));
        } finally {
            client.release();
        }
    }
}