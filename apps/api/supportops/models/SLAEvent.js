/**
 * SLA Event Data Model & Database Helpers
 * Path: models/SLAEvent.js
 * 
 * Tracks SLA targets, countdown timers, response/resolution breaches,
 * and compliance events for support tickets.
 */

export const SLA_METRICS = {
    FIRST_RESPONSE: "first_response",
    NEXT_RESPONSE: "next_response",
    RESOLUTION: "resolution",
};

export const SLA_EVENT_TYPES = {
    TARGET_SET: "target_set",
    WARNING_TRIGGERED: "warning_triggered",
    BREACHED: "breached",
    MET: "met",
    PAUSED: "paused",
    RESUMED: "resumed",
};

export class SLAEvent {
    /**
     * Constructs an SLAEvent instance
     * @param {Object} data 
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.ticketId = data.ticketId || data.ticket_id || null;
        this.orgId = data.orgId || data.org_id || null;

        // SLA Definitions & Event Tracking
        this.metric = data.metric || SLA_METRICS.FIRST_RESPONSE;
        this.eventType = data.eventType || data.event_type || SLA_EVENT_TYPES.TARGET_SET;
        this.targetDurationMinutes = data.targetDurationMinutes ?? data.target_duration_minutes ?? null;

        // Deadline & Compliance State
        this.dueAt = data.dueAt || data.due_at || null;
        this.breachedAt = data.breachedAt || data.breached_at || null;
        this.completedAt = data.completedAt || data.completed_at || null;
        this.isBreached = Boolean(data.isBreached ?? data.is_breached ?? false);

        // Additional Context
        this.metadata = data.metadata || {}; // e.g. holiday calendar rules, paused reason

        // Timestamps
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    /**
     * Helper: Map PostgreSQL database row to SLAEvent model instance
     * @param {Object} row 
     * @returns {SLAEvent}
     */
    static fromRow(row) {
        if (!row) return null;
        return new SLAEvent({
            id: row.id,
            ticketId: row.ticket_id,
            orgId: row.org_id,
            metric: row.metric,
            eventType: row.event_type,
            targetDurationMinutes: row.target_duration_minutes ? parseInt(row.target_duration_minutes, 10) : null,
            dueAt: row.due_at,
            breachedAt: row.breached_at,
            completedAt: row.completed_at,
            isBreached: row.is_breached,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            createdAt: row.created_at,
        });
    }

    /**
     * Record a new SLA event in PostgreSQL
     * @param {Object} pg - Fastify PostgreSQL pool/client
     * @param {Object} eventData 
     * @returns {Promise<SLAEvent>}
     */
    static async record(pg, eventData) {
        const slaEvent = new SLAEvent(eventData);
        const client = await pg.connect();

        try {
            const query = `
          INSERT INTO sla_events (
            ticket_id, org_id, metric, event_type,
            target_duration_minutes, due_at, breached_at,
            completed_at, is_breached, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *;
        `;

            const values = [
                slaEvent.ticketId,
                slaEvent.orgId,
                slaEvent.metric,
                slaEvent.eventType,
                slaEvent.targetDurationMinutes,
                slaEvent.dueAt,
                slaEvent.breachedAt,
                slaEvent.completedAt,
                slaEvent.isBreached,
                JSON.stringify(slaEvent.metadata),
            ];

            const res = await client.query(query, values);
            return SLAEvent.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Fetch all SLA events for a specific ticket
     * @param {Object} pg 
     * @param {number|string} ticketId 
     * @returns {Promise<SLAEvent[]>}
     */
    static async findByTicketId(pg, ticketId) {
        const client = await pg.connect();
        try {
            const res = await client.query(
                "SELECT * FROM sla_events WHERE ticket_id = $1 ORDER BY created_at ASC",
                [ticketId]
            );
            return res.rows.map((row) => SLAEvent.fromRow(row));
        } finally {
            client.release();
        }
    }

    /**
     * Mark active SLA target as met/fulfilled
     * @param {Object} pg 
     * @param {number|string} ticketId 
     * @param {string} metric 
     * @param {Object} [metadata={}]
     * @returns {Promise<SLAEvent>}
     */
    static async markMet(pg, ticketId, metric, metadata = {}) {
        const client = await pg.connect();
        try {
            // Find latest pending or active SLA entry for ticket + metric
            const findRes = await client.query(
                `SELECT * FROM sla_events 
           WHERE ticket_id = $1 AND metric = $2 AND completed_at IS NULL 
           ORDER BY created_at DESC LIMIT 1`,
                [ticketId, metric]
            );

            if (findRes.rows.length === 0) {
                // Record met event directly if no prior target record was open
                return await SLAEvent.record(pg, {
                    ticketId,
                    metric,
                    eventType: SLA_EVENT_TYPES.MET,
                    completedAt: new Date().toISOString(),
                    metadata,
                });
            }

            const activeEvent = findRes.rows[0];
            const now = new Date();
            const isBreached = activeEvent.due_at ? new Date(activeEvent.due_at) < now : false;

            const updateQuery = `
          UPDATE sla_events
          SET completed_at = CURRENT_TIMESTAMP,
              event_type = $1,
              is_breached = $2,
              metadata = metadata || $3::jsonb
          WHERE id = $4
          RETURNING *;
        `;

            const res = await client.query(updateQuery, [
                SLA_EVENT_TYPES.MET,
                isBreached,
                JSON.stringify(metadata),
                activeEvent.id,
            ]);

            return SLAEvent.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Query tickets currently in breach or close to breaching SLA
     * @param {Object} pg 
     * @param {Object} options 
     * @param {number|string} [options.orgId] 
     * @param {boolean} [options.isBreached=true] 
     * @param {number} [options.limit=50] 
     * @returns {Promise<SLAEvent[]>}
     */
    static async findActiveBreaches(pg, { orgId = null, isBreached = true, limit = 50 } = {}) {
        const client = await pg.connect();
        try {
            let query = `
          SELECT * FROM sla_events 
          WHERE is_breached = $1 AND completed_at IS NULL
        `;
            const params = [isBreached];

            if (orgId) {
                params.push(orgId);
                query += ` AND org_id = $${params.length}`;
            }

            query += ` ORDER BY due_at ASC LIMIT $${params.length + 1}`;
            params.push(limit);

            const res = await client.query(query, params);
            return res.rows.map((row) => SLAEvent.fromRow(row));
        } finally {
            client.release();
        }
    }
}