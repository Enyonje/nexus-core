import { requireAuth } from "./auth.js";

/**
 * Audit Routes
 * Provides a deep-dive forensic report of a specific execution, 
 * including neural reasoning, agent contracts, and inter-agent comms.
 */
export async function auditRoutes(server) {
  server.get(
    "/audit/:executionId",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const userId = req.user.id; // Extracted from JWT via requireAuth

        // 1. Mission Summary & Ownership Check
        // Ensures users can only audit their own neural traces
        const executionHeader = await server.pg.query(
          `SELECT id, status, goal_type, started_at, completed_at, metadata
           FROM executions 
           WHERE id = $1 AND user_id = $2`,
          [executionId, userId]
        );

        if (executionHeader.rows.length === 0) {
          return reply.code(404).send({ 
            error: "Trace Not Found", 
            message: "The requested execution ID does not exist or you lack clearance." 
          });
        }

        // 2. Execution Chronology (The "Steps")
        // Fetches the internal reasoning and outputs of the autonomous engine
        const steps = await server.pg.query(
          `SELECT id, step_type, status, reasoning, output, error, created_at
           FROM execution_steps
           WHERE execution_id = $1
           ORDER BY created_at ASC`,
          [executionId]
        );

        // 3. Neural Contracts (The "Agents")
        // Fetches the specific roles assigned during the orchestration
        const contracts = await server.pg.query(
          `SELECT id, agent_id, role, task_description, status
           FROM agent_contracts
           WHERE execution_id = $1`,
          [executionId]
        );

        // 4. Inter-Agent Comms (The "Chatter")
        // Joins messages with contracts to map the dialogue between nodes
        const messages = await server.pg.query(
          `SELECT m.id, m.contract_id, m.sender_role, m.content, m.created_at
           FROM agent_messages m
           JOIN agent_contracts c ON c.id = m.contract_id
           WHERE c.execution_id = $1
           ORDER BY m.created_at ASC`,
          [executionId]
        );

        // Return the compiled Forensic Dossier
        return reply.send({
          executionId,
          summary: executionHeader.rows[0],
          steps: steps.rows,
          contracts: contracts.rows,
          messages: messages.rows,
          integrity: "verified",
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        server.log.error(`[Audit Error] Trace ID ${req.params.executionId}:`, err);
        return reply.code(500).send({ 
          error: "Audit Compilation Failure", 
          message: "Internal neural link error while retrieving logs." 
        });
      }
    }
  );
}