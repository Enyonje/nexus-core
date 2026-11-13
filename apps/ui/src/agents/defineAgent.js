// Contract for an agent listed on nexusthecore.com/agents. One file in ./registry = one agent.
// Plain data only (no JSX, no imports besides this file) so build scripts can read it too.
//
// Add an agent:   cd apps/api && npm run agent:new -- my-agent "My Agent" --category finance
//            or   copy registry/_template.agent.js.example to registry/my-agent.agent.js
// It appears on /agents, gets its own page at /agents/my-agent, and is added to the sitemap.

export const CATEGORIES = {
  security: "Security & Legal",
  support: "DevOps & Support",
  finance: "FinTech & Payments",
  analytics: "Data Intelligence",
  operations: "Operations",
};
export const STATUSES = {
  live: "Production Ready",
  beta: "Beta Access",
  development: "In Development",
  roadmap: "Roadmap",
};
export const ACCENTS = ["cyan", "emerald", "blue", "purple", "amber", "slate"];

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function defineAgent(def) {
  const errors = [];
  if (!SLUG.test(def?.slug || "")) errors.push("slug must be kebab-case");
  if (!def?.name) errors.push("name is required");
  if (!CATEGORIES[def?.category]) errors.push(`category must be one of ${Object.keys(CATEGORIES).join(", ")}`);
  if (!STATUSES[def?.status]) errors.push(`status must be one of ${Object.keys(STATUSES).join(", ")}`);
  if (!def?.summary) errors.push("summary is required");
  if (def?.launch && !def.launch.to && !def.launch.href) errors.push("launch needs `to` (internal path) or `href` (external URL)");
  if (def?.launch?.href && !/^https:\/\//.test(def.launch.href)) errors.push("launch.href must be https");
  if (errors.length) throw new Error(`Agent "${def?.slug || "?"}": ${errors.join("; ")}`);
  return Object.freeze({
    icon: "Bot",
    accent: "cyan",
    product: "nexus-core",
    capabilities: [],
    metrics: { latency: "TBD", throughput: "TBD", accuracy: "TBD" },
    order: 100,
    ...def,
    isLive: def.status === "live" || def.status === "beta",
  });
}
