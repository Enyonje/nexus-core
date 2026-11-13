import { defineAgent } from "../defineAgent.js";

export default defineAgent({ slug: "worker-db", name: "Worker-DB", agentType: "WORKER", system: true, capabilities: { database: true } });
