import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import dns from "node:dns/promises";
import net from "node:net";
import { prisma } from "../config/prisma.js";

const POLL_MS = Number(process.env.MARKETPLACE_WORKER_POLL_MS || 1500);
const EXECUTION_TIMEOUT_MS = Number(process.env.MARKETPLACE_EXECUTION_TIMEOUT_MS || 30000);
const RUNTIME_IMAGE = process.env.MARKETPLACE_RUNTIME_IMAGE || "node:22-alpine";
const SCANNER = path.resolve("src/marketplace/scan_agent_package.py");
let stopping = false;

function isPrivate(address) {
  if (net.isIPv4(address)) {
    const [a,b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0) || (a === 100 && b >= 64 && b <= 127);
  }
  const v = address.toLowerCase();
  if (v.startsWith("::ffff:")) { const mapped = v.slice(7); if (net.isIPv4(mapped)) return isPrivate(mapped); }
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
}
async function assertPublicUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw new Error("Agent endpoint must be HTTPS on port 443.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || net.isIP(host) && isPrivate(host)) throw new Error("Private agent endpoint blocked.");
  const ips = await dns.lookup(host, { all: true });
  if (!ips.length || ips.some(ip => isPrivate(ip.address))) throw new Error("Agent endpoint resolves to a private network.");
  return url;
}
function run(command, args, { input, timeout = EXECUTION_TIMEOUT_MS, maxOutput = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "", stderr = "", settled = false;
    const timer = setTimeout(() => { child.kill("SIGKILL"); finish(new Error("Agent execution timed out.")); }, timeout);
    function finish(error, value) { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : resolve(value); }
    child.stdout.on("data", chunk => { stdout += chunk.toString(); if (stdout.length > maxOutput) { child.kill("SIGKILL"); finish(new Error("Agent output exceeded 1 MB.")); } });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); if (stderr.length > 200000) child.kill("SIGKILL"); });
    child.on("error", finish);
    child.on("close", code => code === 0 ? finish(null, stdout) : finish(new Error(stderr.trim() || `${command} exited with code ${code}`)));
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
  });
}
async function executeHosted(agent, input) {
  const url = await assertPublicUrl(agent.source_url);
  const response = await fetch(url, { method: "POST", redirect: "error", headers: { "content-type": "application/json", "accept": "application/json" }, body: JSON.stringify({ protocol: "nexus-agent-v1", agent: { id: agent.id, slug: agent.slug, version: agent.version }, input }), signal: AbortSignal.timeout(EXECUTION_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Hosted agent returned HTTP ${response.status}.`);
  const text = await response.text();
  if (Buffer.byteLength(text) > 1024 * 1024) throw new Error("Agent response exceeded 1 MB.");
  const parsed = JSON.parse(text);
  if (!Object.prototype.hasOwnProperty.call(parsed, "output")) throw new Error('Agent response must be JSON with an "output" property.');
  return parsed.output;
}
async function executeZip(agent, input) {
  if (!agent.artifact_path) throw new Error("Agent package is missing.");
  if (agent.security_status !== "CLEAN" && process.env.MARKETPLACE_ALLOW_UNSCANNED !== "true") throw new Error("Package has not passed ClamAV scanning.");
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "nexus-market-agent-"));
  const extracted = path.join(tempRoot, "package");
  try {
    await mkdir(extracted, { recursive: true, mode: 0o700 });
    const scan = await run("python3", [SCANNER, agent.artifact_path, "--extract", extracted], { timeout: 60000, maxOutput: 100000 });
    const meta = JSON.parse(scan);
    if (meta.securityStatus !== "CLEAN" && process.env.MARKETPLACE_ALLOW_UNSCANNED !== "true") throw new Error("Package scan is not clean.");
    const projectRoot = path.join(extracted, meta.projectRoot || "");
    const entry = path.posix.normalize(meta.entrypoint);
    if (entry.startsWith("../") || path.isAbsolute(entry)) throw new Error("Unsafe entrypoint.");
    const mountPath = projectRoot;
    const args = ["run", "--rm", "-i", "--network=none", "--read-only", "--memory=256m", "--memory-swap=256m", "--cpus=0.5", "--pids-limit=64", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--user=10001:10001", "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m", "--mount", `type=bind,source=${mountPath},target=/app,readonly`, "--workdir=/app", RUNTIME_IMAGE, "node", entry];
    const raw = await run("docker", args, { input: JSON.stringify({ protocol: "nexus-agent-v1", agent: { id: agent.id, slug: agent.slug, version: agent.version }, input }), timeout: EXECUTION_TIMEOUT_MS, maxOutput: 1024 * 1024 });
    const result = JSON.parse(raw.trim());
    if (!Object.prototype.hasOwnProperty.call(result, "output")) throw new Error('ZIP agent must write JSON with an "output" property to stdout.');
    return result.output;
  } finally { await rm(tempRoot, { recursive: true, force: true }); }
}
async function processOne() {
  const candidate = await prisma.marketplaceExecution.findFirst({ where: { status: "QUEUED" }, orderBy: { created_at: "asc" } });
  if (!candidate) return false;
  const claim = await prisma.marketplaceExecution.updateMany({ where: { id: candidate.id, status: "QUEUED" }, data: { status: "RUNNING", started_at: new Date() } });
  if (!claim.count) return true;
  const started = Date.now();
  try {
    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: candidate.agent_id } });
    if (!agent || agent.status !== "APPROVED") throw new Error("Agent is no longer approved.");
    const output = agent.source === "API" ? await executeHosted(agent, candidate.input) : await executeZip(agent, candidate.input);
    await prisma.$transaction(async tx => {
      await tx.marketplaceExecution.update({ where: { id: candidate.id }, data: { status: "COMPLETED", output, duration_ms: Date.now() - started, completed_at: new Date() } });
      await tx.marketplaceUsageRecord.create({ data: { user_id: candidate.user_id, agent_id: candidate.agent_id, execution_id: candidate.id, units: 1 } });
    });
  } catch (error) {
    await prisma.marketplaceExecution.update({ where: { id: candidate.id }, data: { status: "FAILED", error: String(error.message || error).slice(0, 2000), duration_ms: Date.now() - started, completed_at: new Date() } });
    console.error(`[Marketplace worker] Execution ${candidate.id} failed:`, error.message || error);
  }
  return true;
}

async function main() {
  // Recover jobs abandoned by a crashed worker. Normal executions have a 30-second timeout.
  await prisma.marketplaceExecution.updateMany({
    where: { status: "RUNNING", started_at: { lt: new Date(Date.now() - Math.max(120000, EXECUTION_TIMEOUT_MS * 3)) } },
    data: { status: "QUEUED", started_at: null },
  });
  console.log("Nexus Core marketplace worker started.");
  while (!stopping) {
    try { const worked = await processOne(); if (!worked) await new Promise(resolve => setTimeout(resolve, POLL_MS)); }
    catch (error) { console.error("Marketplace worker loop error:", error); await new Promise(resolve => setTimeout(resolve, 5000)); }
  }
  await prisma.$disconnect();
}
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
main().catch(error => { console.error(error); process.exit(1); });
