// Auto-discovers every agent manifest in ./registry at build time. Nothing to edit here.
const modules = import.meta.glob("./registry/*.agent.js", { eager: true });

const seen = new Map();
export const AGENTS = Object.entries(modules)
  .map(([file, mod]) => {
    const agent = mod.default;
    if (!agent?.slug) throw new Error(`${file} must "export default defineAgent({...})"`);
    if (seen.has(agent.slug)) throw new Error(`Duplicate agent slug "${agent.slug}" in ${file} and ${seen.get(agent.slug)}`);
    seen.set(agent.slug, file);
    return agent;
  })
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

export const getAgent = (slug) => AGENTS.find((a) => a.slug === slug) || null;
export { CATEGORIES, STATUSES } from "./defineAgent.js";
