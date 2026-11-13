import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "support-ops",
  name: "Support-Ops AI",
  category: "support",
  status: "beta",
  icon: "Bot",
  accent: "blue",
  product: "supportops",
  order: 2,
  summary: "Autonomous ticket triage, contextual escalation and SLA risk tracking for support teams.",
  description: "SupportOps triages incoming conversations, drafts replies for review, and flags tickets at risk of breaching SLA. It is hosted as its own application with its own sign-in.",
  capabilities: ["Autonomous Triage", "Contextual Escalation", "API Health Sync"],
  metrics: { latency: "42ms", throughput: "3.1k/s", accuracy: "98.5%" },
  launch: { href: "https://supportops.nexusthecore.com/supportops", label: "Open SupportOps" },
});
