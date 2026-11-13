import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const DEFAULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "plugins");
let cache;

/** Loads every *.js file in src/agents/plugins (files starting with "_" are skipped). */
export async function loadAgentPlugins({ dir = DEFAULT_DIR, fresh = false } = {}) {
  if (cache && !fresh && dir === DEFAULT_DIR) return cache;
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.startsWith("_")).sort() : [];
  const agents = [];
  const seen = new Map();
  for (const file of files) {
    const mod = await import(pathToFileURL(path.join(dir, file)).href);
    const agent = mod.default;
    if (!agent?.slug) throw new Error(`${file} must "export default defineAgent({...})"`);
    if (seen.has(agent.slug)) throw new Error(`Duplicate agent slug "${agent.slug}" in ${file} and ${seen.get(agent.slug)}`);
    seen.set(agent.slug, file);
    agents.push(agent);
  }
  if (dir === DEFAULT_DIR) cache = agents;
  return agents;
}

export const publicAgent = (a) => ({
  slug: a.slug, name: a.name, agentType: a.agentType, version: a.version,
  capabilities: a.capabilities, product: a.product, runnable: typeof a.run === "function",
});
