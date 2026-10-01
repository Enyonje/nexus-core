export async function ticketsRoutes(fastify, options) {
  // Prerequisite: Auth Hook
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorized" });
    }
  });

  // POST / (Create Ticket)
  fastify.post("/", async (request, reply) => {
    const { subject, message, customer_email } = request.body;
    const client = await fastify.pg.connect();

    try {
      await client.query("BEGIN");

      // 1. Create Ticket
      const insertTicketQuery = `
        INSERT INTO tickets (subject, message, customer_email, status)
        VALUES ($1, $2, $3, 'pending')
        RETURNING id, subject, message, customer_email, status, created_at;
      `;
      const ticketRes = await client.query(insertTicketQuery, [
        subject,
        message,
        customer_email,
      ]);
      const ticket = ticketRes.rows[0];

      // Log: TICKET_CREATED
      await client.query(
        `INSERT INTO audit_logs (ticket_id, actor, action, details) VALUES ($1, $2, $3, $4)`,
        [ticket.id, "USER", "TICKET_CREATED", `Subject: ${ticket.subject}`]
      );

      // 2. Generate AI Reply (Stub logic - replace with your AI utility call)
      const aiConfidence = Math.floor(Math.random() * 40) + 60; // Mock confidence score
      const aiReply = `Thank you for reaching out regarding "${subject}". We are inspecting this issue.`;
      const status = aiConfidence > 70 ? "auto-resolved" : "pending";

      // Update Ticket with AI response
      const updateTicketQuery = `
        UPDATE tickets 
        SET ai_reply = $1, ai_confidence = $2, status = $3 
        WHERE id = $4
        RETURNING *;
      `;
      const updatedTicketRes = await client.query(updateTicketQuery, [
        aiReply,
        aiConfidence,
        status,
        ticket.id,
      ]);
      const updatedTicket = updatedTicketRes.rows[0];

      // Log: AUTO_REPLY_GENERATED
      await client.query(
        `INSERT INTO audit_logs (ticket_id, actor, action, details) VALUES ($1, $2, $3, $4)`,
        [ticket.id, "AI", "AUTO_REPLY_GENERATED", `Confidence ${aiConfidence}%`]
      );

      // Log: EMAIL_SENT
      await client.query(
        `INSERT INTO audit_logs (ticket_id, actor, action, details) VALUES ($1, $2, $3, $4)`,
        [ticket.id, "SYSTEM", "EMAIL_SENT", `Sent to ${customer_email}`]
      );

      await client.query("COMMIT");
      return reply.code(201).send(updatedTicket);
    } catch (err) {
      await client.query("ROLLBACK");
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to create ticket" });
    } finally {
      client.release();
    }
  });

  // GET /:ticket_id/timeline
  fastify.get("/:ticket_id/timeline", async (request, reply) => {
    const { ticket_id } = request.params;
    const client = await fastify.pg.connect();

    try {
      const query = `
        SELECT id, ticket_id, actor, action, details, created_at 
        FROM audit_logs 
        WHERE ticket_id = $1 
        ORDER BY created_at ASC
      `;
      const result = await client.query(query, [ticket_id]);
      return reply.send(result.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch timeline" });
    } finally {
      client.release();
    }
  });
}