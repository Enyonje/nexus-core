// node --test scripts/*.test.mjs — checks every agent manifest before it reaches /agents.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const dir = path.resolve("src/agents/registry");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".agent.js"));
const load = async (f) => (await import(pathToFileURL(path.join(dir, f)).href)).default;

test("every manifest is valid and its file name matches its slug", async () => {
  for (const f of files) {
    const agent = await load(f);
    assert.equal(`${agent.slug}.agent.js`, f);
  }
});

test("slugs are unique", async () => {
  const slugs = await Promise.all(files.map(async (f) => (await load(f)).slug));
  assert.equal(new Set(slugs).size, slugs.length);
});

test("live agents have somewhere to launch to", async () => {
  for (const f of files) {
    const a = await load(f);
    if (a.status === "live") assert.ok(a.launch?.to || a.launch?.href, `${a.slug} is live but has no launch target`);
  }
});

test("defineAgent rejects a bad status", async () => {
  const { defineAgent } = await import(pathToFileURL(path.resolve("src/agents/defineAgent.js")).href);
  assert.throws(() => defineAgent({ slug: "x", name: "X", category: "finance", status: "shipped", summary: "s" }), /status/);
});
