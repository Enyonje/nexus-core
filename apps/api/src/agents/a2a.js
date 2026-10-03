import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import { enqueueExecution } from "./queue.js"; // optional: auto-spawn jobs

/**
 * Create an agent-to-agent contract
 */
export async function createContract({
  executionId,
  requesterAgentId,
  responderAgentId,
  contract,
}) {
  const { rows } = await db.query(
    `
    INSERT INTO agent_contracts
      (execution_id, requester_agent, responder_agent, contract, accepted, created_at)
    VALUES
      ($1, $2, $3, $4, true, NOW())
    RETURNING id
    `,
    [
      executionId,
      requesterAgentId,
      responderAgentId,
      JSON.stringify(contract),
    ]
  );

  const contractId = rows[0].id;

  // 🔥 Publish contract creation event
  publishEvent(executionId, {
    event: "agent_contract_created",
    contractId,
    requesterAgentId,
    responderAgentId,
    contract,
  });

  // 🔥 Auto-spawn responder agent job if it's a worker
  const { rows: responder } = await db.query(
    `SELECT agent_type FROM agents WHERE id = $1`,
    [responderAgentId]
  );
  if (responder.length && responder[0].agent_type === "WORKER") {
    await enqueueExecution(executionId);
  }

  return contractId;
}

/**
 * Send message under a contract
 */
export async function sendAgentMessage({
  contractId,
  senderAgentId,
  message,
}) {
  const { rows } = await db.query(
    `
    INSERT INTO agent_messages
      (contract_id, sender_agent, message, created_at)
    VALUES
      ($1, $2, $3, NOW())
    RETURNING id
    `,
    [contractId, senderAgentId, JSON.stringify(message)]
  );

  const messageId = rows[0].id;

  // 🔥 Publish message event
  publishEvent("system", {
    event: "agent_message_sent",
    contractId,
    senderAgentId,
    message,
    messageId,
  });

  return messageId;
}