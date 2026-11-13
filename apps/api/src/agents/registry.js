import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import { enqueueExecution } from "../agents/queue.js";
import { loadAgentPlugins } from "./loader.js";

/**
 * Make sure every agent plugin in src/agents/plugins has a row in the agents table.
 * Inserts new agents, updates capabilities that changed, and keeps WORKER agents queued.
 * Adding an agent = adding a plugin file; nothing to edit here.
 */
export async function ensureSystemAgents() {
  const agents = await loadAgentPlugins();

  for (const agent of agents) {
    const { rows } = await db.query(
      `SELECT id, capabilities FROM agents WHERE name = $1 AND agent_type = $2`,
      [agent.name, agent.agentType]
    );

    let agentId;
    if (rows.length === 0) {
      const { rows: inserted } = await db.query(
        `INSERT INTO agents (name, agent_type, capabilities, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id`,
        [agent.name, agent.agentType, agent.capabilities]
      );
      agentId = inserted[0].id;
      publishEvent("system", { event: "agent_registered", agentId, name: agent.name, type: agent.agentType });
    } else {
      agentId = rows[0].id;
      if (JSON.stringify(rows[0].capabilities) !== JSON.stringify(agent.capabilities)) {
        // Previously passed three parameters for a two-parameter statement, which Postgres rejects.
        await db.query(`UPDATE agents SET capabilities = $2, updated_at = NOW() WHERE id = $1`, [agentId, agent.capabilities]);
        publishEvent("system", { event: "agent_updated", agentId, name: agent.name, type: agent.agentType });
      }
    }

    if (agent.agentType === "WORKER") await enqueueExecution(agentId);
  }
}
