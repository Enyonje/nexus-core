import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { buildApp } from "../src/app.js";
import { createMemoryStore } from "../src/auth/stores/memoryStore.js";
import { loadAgentPlugins } from "../src/agents/loader.js";
import { defineAgent } from "../src/agents/defineAgent.js";

const env = { NODE_ENV: "test", JWT_SECRET: "z".repeat(40), COOKIE_SECRET: "c".repeat(20) };

test("every plugin file becomes an agent in /api/agents", async () => {
  const app = await buildApp({ store: createMemoryStore(), env, legacyRoutes: false, logger: false });
  const res = await app.inject({ method: "GET", url: "/api/agents" });
  const slugs = res.json().agents.map((a) => a.slug);
  for (const s of ["architect", "worker-api", "worker-db", "sentinel", "cross-border-compliance"]) assert.ok(slugs.includes(s), s);
});

test("running an agent needs a sign-in to the agent's own product", async () => {
  const store = createMemoryStore();
  const app = await buildApp({ store, env, legacyRoutes: false, logger: false });
  const nc = await app.inject({ method: "POST", url: "/api/nexus-core/auth/register", payload: { email: "a@example.com", password: "correct-horse-battery" } });
  const run = (token) => app.inject({ method: "POST", url: "/api/agents/cross-border-compliance/run", headers: token ? { authorization: `Bearer ${token}` } : {}, payload: { input: { cifValueUsd: 1000, exchangeRate: 130 } } });
  assert.equal((await run()).statusCode, 401);
  assert.equal((await run(nc.json().token)).statusCode, 401);
  const cb = await app.inject({ method: "POST", url: "/api/compliance/auth/register", payload: { email: "a@example.com", password: "correct-horse-battery" } });
  const ok = await run(cb.json().token);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().output.cifValueKes, 130000);
});

test("duplicate slugs and bad definitions are caught at load time", async () => {
  assert.throws(() => defineAgent({ slug: "Bad Slug", name: "x", agentType: "WORKER" }));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-"));
  const def = `import { defineAgent } from ${JSON.stringify(path.resolve("src/agents/defineAgent.js"))};\nexport default defineAgent({ slug: "dup", name: "Dup", agentType: "WORKER" });\n`;
  fs.writeFileSync(path.join(dir, "a.js"), def);
  fs.writeFileSync(path.join(dir, "b.js"), def);
  await assert.rejects(loadAgentPlugins({ dir }), /Duplicate agent slug "dup"/);
});
