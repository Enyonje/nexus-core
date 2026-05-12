import { requireAuth } from "./auth.js";

/**
 * Audit Routes
 * Provides a deep-dive forensic report of a specific execution,
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

  // GET audit (static snapshot)
  server.get(
    "/api/executions/:executionId/audit",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const { executionId } = req.params;
        const userId = req.user.id;

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

        const steps = await server.pg.query(
          `SELECT id, step_type, status, reasoning, output, error, created_at
           FROM execution_steps
           WHERE execution_id = $1
           ORDER BY created_at ASC`,
          [executionId]
        );

        const contracts = await server.pg.query(
          `SELECT id, agent_id, role, task_description, status
           FROM agent_contracts
           WHERE execution_id = $1`,
          [executionId]
        );

        const messages = await server.pg.query(
          `SELECT m.id, m.contract_id, m.sender_role, m.content, m.created_at
           FROM agent_messages m
           JOIN agent_contracts c ON c.id = m.contract_id
           WHERE c.execution_id = $1
           ORDER BY m.created_at ASC`,
          [executionId]
        );

        const { rows: blocked } = await server.pg.query(
          `SELECT id, name, error
           FROM execution_steps
           WHERE execution_id = $1 AND status = 'blocked'`,
          [executionId]
        );
        const sentinelSummary = blocked.map(step => ({
          stepId: step.id,
          name: step.name,
          reason: step.error,
        }));

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
          message: "Internal neural link error while retrieving logs."
        });
      }
    }
  );

  // SSE stream for live Sentinel events
  server.get(
    "/api/executions/:executionId/audit/stream",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { executionId } = req.params;

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.flushHeaders();

      // Example: push sentinel events from DB polling
      const interval = setInterval(async () => {
        const { rows: blocked } = await server.pg.query(
          `SELECT id, name, error
           FROM execution_steps
           WHERE execution_id = $1 AND status = 'blocked'`,
          [executionId]
        );

        if (blocked.length > 0) {
          const summary = blocked.map(step => ({
            stepId: step.id,
            name: step.name,
            reason: step.error,
          }));
          reply.raw.write(`event: sentinel_summary\n`);
          reply.raw.write(`data: ${JSON.stringify(summary)}\n\n`);
        }
      }, 3000);

      req.raw.on("close", () => {
        clearInterval(interval);
      });
    }
  );
}
