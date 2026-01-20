import { db } from "../db/db.js";

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
    await db.query(
      `
      INSERT INTO agents (name, agent_type, capabilities)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      `,
      [agent.name, agent.agent_type, agent.capabilities]
    );
  }
}
