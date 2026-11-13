import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "sentra-threat-sentinel",
  name: "Sentra Graph Threat Sentinel",
  category: "security",
  status: "development",
  icon: "Lock",
  accent: "purple",
  order: 10,
  summary: "Graph-based threat modelling that simulates attack paths before they reach production.",
  capabilities: ["Graph Attack Vectors", "Zero-Day Emulation", "SIEM Live Feeds"],
  metrics: { latency: "< 50ms", throughput: "Planned", accuracy: "Target 99.5%" },
});
