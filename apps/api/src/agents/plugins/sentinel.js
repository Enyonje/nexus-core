import { defineAgent } from "../defineAgent.js";

export default defineAgent({ slug: "sentinel", name: "Sentinel", agentType: "GOVERNANCE", system: true, capabilities: { validation: true } });
