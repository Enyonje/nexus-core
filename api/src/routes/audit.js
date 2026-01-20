import { db } from "../db/db.js";

export async function auditRoutes(server) {
  server.get("/audit/:executionId", async (req) => {
    const { executionId } = req.params;

    const steps = await db.query(
      `
      SELECT step_type, status, reasoning, output, error, created_at
      FROM execution_steps
      WHERE execution_id = $1
      ORDER BY created_at
      `,
      [executionId]
    );

    const contracts = await db.query(
      `
      SELECT *
      FROM agent_contracts
      WHERE execution_id = $1
      `,
      [executionId]
    );

    const messages = await db.query(
      `
      SELECT m.*
      FROM agent_messages m
      JOIN agent_contracts c ON c.id = m.contract_id
      WHERE c.execution_id = $1
      `,
      [executionId]
    );

    return {
      executionId,
      steps: steps.rows,
      contracts: contracts.rows,
      messages: messages.rows,
    };
  });
}
