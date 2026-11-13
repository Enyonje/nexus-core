import { defineAgent } from "../defineAgent.js";

export default defineAgent({ slug: "worker-api", name: "Worker-API", agentType: "WORKER", system: true, capabilities: { api: true } });
