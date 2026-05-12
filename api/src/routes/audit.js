import { requireAuth } from "./auth.js";

/**
 * Audit Routes
 * Provides a forensic report of a specific execution,
 * including steps, contracts, messages, and Sentinel summary.
 */
export async function auditRoutes(server) {
  // OPTIONS preflight for CORS
  server.options("/api/executions/:executionId/audit", async (req, reply) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "https://nexusthecore.com",
      "https://nexus-core-chi.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ];

    if (origin && allowedOrigins.includes(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Methods", "GET,OPTIONS");
      reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    return reply.code(204).send();
  });

  // GET audit
  server.get(
    "/api/executions/:executionId/audit",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const userId = req.user.id;

        // Execution summary
        const executionHeader = await server.pg.query(
          `SELECT id, status, goal_type, started_at, finished_at, metadata
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

        // Steps chronology (use started_at instead of created_at)
        const steps = await server.pg.query(
          `SELECT id, step_type, status, reasoning, output, error, started_at, finished_at
           FROM execution_steps
           WHERE execution_id = $1
           ORDER BY started_at ASC`,
          [executionId]
        );

        // Agent contracts
        const contracts = await server.pg.query(
          `SELECT id, agent_id, role, task_description, status
           FROM agent_contracts
           WHERE execution_id = $1`,
          [executionId]
        );

        // Agent messages
        const messages = await server.pg.query(
          `SELECT m.id, m.contract_id, m.sender_role, m.content, m.created_at
           FROM agent_messages m
           JOIN agent_contracts c ON c.id = m.contract_id
           WHERE c.execution_id = $1
           ORDER BY m.created_at ASC`,
          [executionId]
        );

        // Sentinel summary (blocked steps)
        const { rows: blocked } = await server.pg.query(
          `SELECT id, name, error, started_at
           FROM execution_steps
           WHERE execution_id = $1 AND status = 'blocked'`,
          [executionId]
        );
        const sentinelSummary = blocked.map(step => ({
          stepId: step.id,
          name: step.name,
          reason: step.error,
          started_at: step.started_at
        }));

        // Response
        return reply.send({
          executionId,
          summary: executionHeader.rows[0],
          steps: steps.rows,
          contracts: contracts.rows,
          messages: messages.rows,
          sentinelSummary,
          integrity: "verified",
          timestamp: new Date().toISOString()
        });

      } catch (err) {
        server.log.error(`[Audit Error] Trace ID ${req.params.executionId}:`, err);
        return reply.code(500).send({
          error: "Audit Compilation Failure",
          message: "Internal error while retrieving logs."
        });
      }
    }
  );
}
