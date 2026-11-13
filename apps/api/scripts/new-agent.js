#!/usr/bin/env node
// Scaffolds a new agent for both the website directory and the API.
//   npm run agent:new -- invoice-reconciler "Invoice Reconciler" [--category finance] [--product nexus-core]
// Creates:
//   apps/ui/src/agents/registry/<slug>.agent.js   (listing on /agents and the page /agents/<slug>)
//   apps/api/src/agents/plugins/<slug>.js         (server-side runtime, POST /api/agents/<slug>/run)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const [slug, name, ...rest] = process.argv.slice(2);
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d; };
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "") || !name) {
  console.error('Usage: npm run agent:new -- <kebab-slug> "Display Name" [--category security|support|finance|analytics|operations] [--product nexus-core|compliance|supportops]');
  process.exit(1);
}
const category = flag("category", "operations");
const product = flag("product", "nexus-core");
const uiFile = path.resolve(here, "../../ui/src/agents/registry", `${slug}.agent.js`);
const apiFile = path.resolve(here, "../src/agents/plugins", `${slug}.js`);
for (const f of [uiFile, apiFile]) if (fs.existsSync(f)) { console.error(`Already exists: ${f}`); process.exit(1); }

fs.mkdirSync(path.dirname(uiFile), { recursive: true });
fs.writeFileSync(uiFile, `import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "${slug}",
  name: ${JSON.stringify(name)},
  category: "${category}",
  status: "beta",            // live | beta | development | roadmap
  icon: "Bot",               // any lucide-react icon name listed in src/agents/icons.js
  accent: "cyan",            // cyan | emerald | blue | purple | amber | slate
  product: "${product}",
  summary: "One sentence on the job this agent does.",
  capabilities: ["Capability one", "Capability two"],
  metrics: { latency: "TBD", throughput: "TBD", accuracy: "TBD" },
  // launch: { to: "/your-route" }  or  { href: "https://..." }  — omit to show the generated detail page only
});
`);
fs.writeFileSync(apiFile, `import { defineAgent } from "../defineAgent.js";

export default defineAgent({
  slug: "${slug}",
  name: ${JSON.stringify(name)},
  agentType: "WORKER",
  product: "${product}",
  capabilities: {},
  async run({ input, user, log }) {
    log.info({ user: user.id }, "${slug} ran");
    return { echo: input };
  },
});
`);
console.log(`Created\n  ${path.relative(process.cwd(), uiFile)}\n  ${path.relative(process.cwd(), apiFile)}\nIt now appears on /agents and /agents/${slug}; the API serves it at /api/agents/${slug}.`);
