import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import { enqueueExecution } from "../agents/queue.js"; // BullMQ/RabbitMQ integration

/**
 * Ensure system agents exist and are up-to-date.
 * Inserts missing agents, updates capabilities if changed,
 * and auto-spawns worker jobs for operational agents.
 */
export async function ensureSystemAgents() {
  const agents = [
    {
      name: "Architect",
      agent_type: "ARCHITECT",
      capabilities: { planning: true },
    },
    {
      name: "Worker-API",
      agent_type: "WORKER",
      capabilities: { api: true },
    },
    {
      name: "Worker-DB",
      agent_type: "WORKER",
      capabilities: { database: true },
    },
    {
      name: "Sentinel",
      agent_type: "GOVERNANCE",
      capabilities: { validation: true },
    },
  ];

  for (const agent of agents) {
    const { rows } = await db.query(
      `SELECT id, capabilities
       FROM agents
       WHERE name = $1 AND agent_type = $2`,
      [agent.name, agent.agent_type]
    );

    if (rows.length === 0) {
      // Insert new agent
      const { rows: inserted } = await db.query(
        `INSERT INTO agents (name, agent_type, capabilities, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING id`,
        [agent.name, agent.agent_type, agent.capabilities]
      );

      publishEvent("system", {
        event: "agent_registered",
        agentId: inserted[0].id,
        name: agent.name,
        type: agent.agent_type,
      });

      // 🔥 Auto-spawn worker jobs for operational agents
      if (agent.agent_type === "WORKER") {
        await enqueueExecution(inserted[0].id);
      }
    } else {
      // Update capabilities if changed
      const existing = rows[0];
      if (JSON.stringify(existing.capabilities) !== JSON.stringify(agent.capabilities)) {
        await db.query(
          `UPDATE agents
           SET capabilities = $3, updated_at = NOW()
           WHERE id = $1`,
          [existing.id, agent.name, agent.capabilities]
        );

        publishEvent("system", {
          event: "agent_updated",
          agentId: existing.id,
          name: agent.name,
          type: agent.agent_type,
        });
      }

      // 🔥 Ensure workers are active
      if (agent.agent_type === "WORKER") {
        await enqueueExecution(existing.id);
      }
    }
  }
}