import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "architect",
  name: "Architect",
  agentType: "ARCHITECT",
  system: true,
  capabilities: { planning: true },
});
