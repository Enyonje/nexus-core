// Contract for a server-side agent plugin. One file in src/agents/plugins/ = one agent.
//
//   export default defineAgent({
//     slug: "invoice-reconciler",          // unique, kebab-case; same slug as the website manifest
//     name: "Invoice Reconciler",
//     agentType: "WORKER",                 // ARCHITECT | WORKER | GOVERNANCE
//     version: "1.0.0",
//     capabilities: { finance: true },
//     product: "nexus-core",               // which product's sign-in protects it
//     async run({ input, user, log }) { ... return { output } }   // optional
//   });

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TYPES = new Set(["ARCHITECT", "WORKER", "GOVERNANCE"]);

export function defineAgent(def) {
  const errors = [];
  if (!def || typeof def !== "object") throw new Error("defineAgent() needs an object");
  if (!SLUG.test(def.slug || "")) errors.push("slug must be kebab-case");
  if (!def.name || typeof def.name !== "string") errors.push("name is required");
  if (!TYPES.has(def.agentType)) errors.push(`agentType must be one of ${[...TYPES].join(", ")}`);
  if (def.run && typeof def.run !== "function") errors.push("run must be a function");
  if (errors.length) throw new Error(`Invalid agent "${def.slug || "?"}": ${errors.join("; ")}`);
  return Object.freeze({
    version: "1.0.0",
    capabilities: {},
    product: "nexus-core",
    system: false,
    ...def,
  });
}
