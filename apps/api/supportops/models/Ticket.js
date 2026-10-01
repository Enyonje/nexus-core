/**
 * Ticket Data Model & Helper Methods
 * Path: models/Ticket.js
 * 
 * Manages customer support tickets, AI generation metadata, 
 * assignment states, and ticket lifecycle workflows.
 */

export const TICKET_STATUS = {
    PENDING: "pending",
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    AUTO_RESOLVED: "auto-resolved",
    RESOLVED: "resolved",
    CLOSED: "closed",
};

export const TICKET_PRIORITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    URGENT: "urgent",
};

export class Ticket {
    /**
     * Constructs a Ticket instance
     * @param {Object} data 
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.orgId = data.orgId || data.org_id || null;
        this.userId = data.userId || data.user_id || null;

        // Ticket Content
        this.subject = data.subject || "";
        this.message = data.message || "";
        this.customerEmail = data.customerEmail || data.customer_email || "";
        this.customerName = data.customerName || data.customer_name || "";

        // Status & Classification
        this.status = data.status || TICKET_STATUS.PENDING;
        this.priority = data.priority || TICKET_PRIORITY.MEDIUM;
        this.assignedTo = data.assignedTo || data.assigned_to || null; // Agent User ID

        // AI Metadata
        this.aiReply = data.aiReply || data.ai_reply || null;
        this.aiConfidence = data.aiConfidence ?? data.ai_confidence ?? null; // 0 - 100

        // Timestamps
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
        this.updatedAt = data.updatedAt || data.updated_at || new Date().toISOString();
        this.closedAt = data.closedAt || data.closed_at || null;
    }

    /**
     * Helper: Map PostgreSQL database row to Ticket model instance
     * @param {Object} row 
     * @returns {Ticket}
     */
    static fromRow(row) {
        if (!row) return null;
        return new Ticket({
            id: row.id,
            orgId: row.org_id,
            userId: row.user_id,
            subject: row.subject,
            message: row.message,
            customerEmail: row.customer_email,
            customerName: row.customer_name,
            status: row.status,
            priority: row.priority,
            assignedTo: row.assigned_to,
            aiReply: row.ai_reply,
            aiConfidence: row.ai_confidence ? parseFloat(row.ai_confidence) : null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            closedAt: row.closed_at,
        });
    }

    /**
     * Create a new support ticket in PostgreSQL
     * @param {Object} pg - Fastify PostgreSQL pool/client
     * @param {Object} ticketData 
     * @returns {Promise<Ticket>}
     */
    static async create(pg, ticketData) {
        const ticket = new Ticket(ticketData);
        const client = await pg.connect();

        try {
            const query = `
          INSERT INTO tickets (
            org_id, user_id, subject, message, customer_email, 
            customer_name, status, priority, assigned_to, ai_reply, ai_confidence
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *;
        `;

            const values = [
                ticket.orgId,
                ticket.userId,
                ticket.subject,
                ticket.message,
                ticket.customerEmail,
                ticket.customerName,
                ticket.status,
                ticket.priority,
                ticket.assignedTo,
                ticket.aiReply,
                ticket.aiConfidence,
            ];

            const res = await client.query(query, values);
            return Ticket.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Find ticket by ID
     * @param {Object} pg 
     * @param {number|string} id 
     * @returns {Promise<Ticket|null>}
     */
    static async findById(pg, id) {
        const client = await pg.connect();
        try {
            const res = await client.query("SELECT * FROM tickets WHERE id = $1", [id]);
            return res.rows[0] ? Ticket.fromRow(res.rows[0]) : null;
        } finally {
            client.release();
        }
    }

    /**
     * Fetch all tickets with optional filtering and pagination
     * @param {Object} pg 
     * @param {Object} options
     * @param {number|string} [options.orgId] 
     * @param {string} [options.status] 
     * @param {number} [options.limit=50] 
     * @param {number} [options.offset=0] 
     * @returns {Promise<Ticket[]>}
     */
    static async findAll(pg, { orgId = null, status = null, limit = 50, offset = 0 } = {}) {
        const client = await pg.connect();
        try {
            let query = "SELECT * FROM tickets WHERE 1=1";
            const params = [];

            if (orgId) {
                params.push(orgId);
                query += ` AND org_id = $${params.length}`;
            }

            if (status) {
                params.push(status);
                query += ` AND status = $${params.length}`;
            }

            query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const res = await client.query(query, params);
            return res.rows.map((row) => Ticket.fromRow(row));
        } finally {
            client.release();
        }
    }

    /**
     * Update AI response metadata and status
     * @param {Object} pg 
     * @param {number|string} ticketId 
     * @param {Object} aiData
     * @param {string} aiData.reply 
     * @param {number} aiData.confidence 
     * @param {string} [aiData.status] 
     * @returns {Promise<Ticket>}
     */
    static async updateAIReply(pg, ticketId, { reply, confidence, status = null }) {
        const client = await pg.connect();
        try {
            const newStatus = status || (confidence > 70 ? TICKET_STATUS.AUTO_RESOLVED : TICKET_STATUS.PENDING);

            const query = `
          UPDATE tickets
          SET ai_reply = $1,
              ai_confidence = $2,
              status = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `;

            const res = await client.query(query, [reply, confidence, newStatus, ticketId]);
            if (res.rows.length === 0) {
                throw new Error("TICKET_NOT_FOUND");
            }
            return Ticket.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }

    /**
     * Assign ticket to an agent or update ticket status
     * @param {Object} pg 
     * @param {number|string} ticketId 
     * @param {Object} updates
     * @param {number|string} [updates.assignedTo] 
     * @param {string} [updates.status] 
     * @param {string} [updates.priority] 
     * @returns {Promise<Ticket>}
     */
    static async updateStatus(pg, ticketId, { assignedTo = null, status = null, priority = null }) {
        const client = await pg.connect();
        try {
            const query = `
          UPDATE tickets
          SET assigned_to = COALESCE($1, assigned_to),
              status = COALESCE($2, status),
              priority = COALESCE($3, priority),
              closed_at = CASE WHEN $2 IN ('resolved', 'closed', 'auto-resolved') THEN CURRENT_TIMESTAMP ELSE closed_at END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
          RETURNING *;
        `;

            const res = await client.query(query, [assignedTo, status, priority, ticketId]);
            if (res.rows.length === 0) {
                throw new Error("TICKET_NOT_FOUND");
            }
            return Ticket.fromRow(res.rows[0]);
        } finally {
            client.release();
        }
    }
}