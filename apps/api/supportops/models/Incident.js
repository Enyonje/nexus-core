/**
 * Incident Data Model & Helper Methods
 * Path: models/Incident.js
 * 
 * Tracks system outages, security vulnerabilities, automated AI alerts,
 * and high-severity operational incidents requiring response.
 */

export const INCIDENT_SEVERITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
};

export const INCIDENT_STATUS = {
    OPEN: "open",
    INVESTIGATING: "investigating",
    MITIGATED: "mitigated",
    RESOLVED: "resolved",
    CLOSED: "closed",
};

export class Incident {
    /**
     * Constructs an Incident instance
     * @param {Object} data 
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.orgId = data.orgId || data.org_id || null;
        this.ticketId = data.ticketId || data.ticket_id || null;
        this.executionId = data.executionId || data.execution_id || null;
        this.reportedBy = data.reportedBy || data.reported_by || null; // User ID or 'system'

        // Incident Details
        this.title = data.title || "";
        this.description = data.description || "";
        this.category = data.category || "general"; // e.g., 'security', 'system_failure', 'ai_hallucination', 'budget_exceeded'
        this.severity = data.severity || INCIDENT_SEVERITY.MEDIUM;
        this.status = data.status || INCIDENT_STATUS.OPEN;
        this.assignedTo = data.assignedTo || data.assigned_to || null; // Responder User ID

        // Technical Context & Metadata
        this.metadata = data.metadata || {}; // System state, stack traces, metrics payload
        this.resolutionSummary = data.resolutionSummary || data.resolution_summary || null;

        // Timestamps
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
        this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
        this.resolvedAt = data.resolvedAt || data.resolved_at || null;
    }

    /**
     * Helper: Map PostgreSQL database row to Incident model instance
     * @param {Object} row 
     * @returns {Incident}
     */
    static fromRow(row) {
        if (!row) return null;
        return new Incident({
            id: row.id,
            orgId: row.org_id,
            ticketId: row.ticket_id,
            executionId: row.execution_id,
            reportedBy: row.reported_by,
            title: row.title,
            description: row.description,
            category: row.category,
            severity: row.severity,
            status: row.status,
            assignedTo: row.assigned_to,
            metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
            resolutionSummary: row.resolution_summary,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            resolvedAt: row.resolved_at,
        });
    }

    /**
     * Create a new Incident record in PostgreSQL
     * @param {Object} pg - Fastify PostgreSQL pool/client
     * @param {Object} incidentData 
     * @returns {Promise<Incident>}
     */
    static async create(pg, incidentData) {
        const incident = new Incident(incidentData);
        const client = await pg.connect();

        try {
            const query = `
          INSERT INTO incidents (
            org_id, ticket_id, execution_id, reported_by,
            title, description, category, severity, status,
            assigned_to, metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *;
        `;

            const values = [
                incident.orgId,
                incident.ticketId,
                incident.executionId,
                incident.reportedBy,
                incident.title,
                incident.description,
                incident.category,
                incident.severity,
                incident.status,
                incident.assignedTo,
                JSON.stringify(incident.metadata),
            ];

            const res = await client.query(query, values);
            return Incident.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Find incident by ID
     * @param {Object} pg 
     * @param {number|string} id 
     * @returns {Promise<Incident|null>}
     */
    static async findById(pg, id) {
        const client = await pg.connect();
        try {
            const res = await client.query("SELECT * FROM incidents WHERE id = $1", [id]);
            return res.rows[0] ? Incident.fromRow(res.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    /**
     * Retrieve active or filtered incidents
     * @param {Object} pg 
     * @param {Object} options 
     * @param {number|string} [options.orgId] 
     * @param {string} [options.status] 
     * @param {string} [options.severity] 
     * @param {number} [options.limit=50] 
     * @param {number} [options.offset=0] 
     * @returns {Promise<Incident[]>}
     */
    static async findAll(pg, { orgId = null, status = null, severity = null, limit = 50, offset = 0 } = {}) {
        const client = await pg.connect();
        try {
            let query = "SELECT * FROM incidents WHERE 1=1";
            const params = [];

            if (orgId) {
                params.push(orgId);
                query += ` AND org_id = $${params.length}`;
            }

            if (status) {
                params.push(status);
                query += ` AND status = $${params.length}`;
            }

            if (severity) {
                params.push(severity);
                query += ` AND severity = $${params.length}`;
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const res = await client.query(query, params);
            return res.rows.map((row) => Incident.fromRow(row));
        } finally {
            client.release();
        }
    }

    /**
     * Update incident lifecycle status and responder details
     * @param {Object} pg 
     * @param {number|string} incidentId 
     * @param {Object} updates 
     * @param {string} [updates.status] 
     * @param {number|string} [updates.assignedTo] 
     * @param {string} [updates.resolutionSummary] 
     * @returns {Promise<Incident>}
     */
    static async updateStatus(pg, incidentId, { status = null, assignedTo = null, resolutionSummary = null }) {
        const client = await pg.connect();
        try {
            const query = `
          UPDATE incidents
          SET status = COALESCE($1, status),
              assigned_to = COALESCE($2, assigned_to),
              resolution_summary = COALESCE($3, resolution_summary),
              resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `;

            const res = await client.query(query, [status, assignedTo, resolutionSummary, incidentId]);
            if (res.rows.length === 0) {
                throw new Error("INCIDENT_NOT_FOUND");
            }
            return Incident.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }
}