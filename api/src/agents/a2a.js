import { db } from "../db/db.js";

/**
 * Create an agent-to-agent contract
 */
export async function createContract({
  executionId,
  requesterAgentId,
  responderAgentId,
  contract,
}) {
  const res = await db.query(
    `
    INSERT INTO agent_contracts
      (execution_id, requester_agent, responder_agent, contract, accepted)
    VALUES
      ($1, $2, $3, $4, true)
    RETURNING id
    `,
    [
      executionId,
      requesterAgentId,
      responderAgentId,
      JSON.stringify(contract),
    ]
  );

  return res.rows[0].id;
}

/**
 * Send message under a contract
 */
export async function sendAgentMessage({
  contractId,
  senderAgentId,
  message,
}) {
  await db.query(
    `
    INSERT INTO agent_messages
      (contract_id, sender_agent, message)
    VALUES
      ($1, $2, $3)
    `,
    [contractId, senderAgentId, JSON.stringify(message)]
  );
}
