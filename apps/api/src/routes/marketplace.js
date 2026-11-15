import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import dns from "node:dns/promises";
import net from "node:net";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from "../security/authMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = path.resolve(process.env.AGENT_MARKETPLACE_STORAGE || path.join(__dirname, "../../storage/agent-marketplace"));
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_INPUT_BYTES = 64 * 1024;
const COMMISSION_BPS = Math.min(5000, Math.max(0, Number(process.env.MARKETPLACE_COMMISSION_BPS || 1500)));
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const allowedCategories = ["Marketing", "Sales", "Customer Support", "Finance", "Research", "Development", "Productivity", "Automation", "Other"];

function fail(statusCode, message) { return Object.assign(new Error(message), { statusCode }); }
function slugify(value = "") { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "agent"; }
function safeString(value, max) { return String(value ?? "").trim().slice(0, max); }
function isZip(buffer) { return buffer?.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]); }
function publicAgent(agent) {
  return { id: agent.id, slug: agent.slug, name: agent.name, description: agent.description, category: agent.category,
    version: agent.version, priceCents: agent.price_cents, currency: agent.currency, pricingModel: agent.pricing_model,
    status: agent.status, source: agent.source, submittedAt: agent.submitted_at, securityStatus: agent.security_status, rejectionReason: agent.rejection_reason };
}
async function storeArchive(buffer) {
  await mkdir(STORAGE_DIR, { recursive: true, mode: 0o700 });
  const filename = `${randomUUID()}.zip`;
  const destination = path.join(STORAGE_DIR, filename);
  await writeFile(destination, buffer, { flag: "wx", mode: 0o600 });
  return destination;
}
function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a,b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 0 || b === 168)) || (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0) || (a === 100 && b >= 64 && b <= 127);
  }
  const value = address.toLowerCase();
  if (value.startsWith("::ffff:")) { const mapped = value.slice(7); if (net.isIPv4(mapped)) return isPrivateAddress(mapped); }
  return value === "::1" || value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb") || value.startsWith("ff");
}
async function assertPublicHttpsUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw fail(400, "Enter a valid HTTPS agent endpoint."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port && url.port !== "443") throw fail(400, "Agent endpoints must be public HTTPS URLs on the standard port.");
  const host = url.hostname.toLowerCase();
  if (["localhost", "localhost.localdomain"].includes(host) || host.endsWith(".local") || net.isIP(host) && isPrivateAddress(host)) throw fail(400, "Private or local agent endpoints are not allowed.");
  let records;
  try { records = await dns.lookup(host, { all: true, verbatim: true }); } catch { throw fail(400, "Agent endpoint hostname could not be resolved."); }
  if (!records.length || records.some(record => isPrivateAddress(record.address))) throw fail(400, "Agent endpoint resolves to a private or reserved network address.");
  return url.toString();
}
async function validateArchive(filePath) {
  const scanner = path.resolve(__dirname, "../marketplace/scan_agent_package.py");
  const result = spawnSync("python3", [scanner, filePath], { encoding: "utf8", timeout: 90000, maxBuffer: 1024 * 1024 });
  if (result.error?.code === "ENOENT") throw fail(503, "Python 3 is required for safe agent package inspection.");
  let parsed;
  try { parsed = JSON.parse(result.stdout || "{}"); } catch { throw fail(503, "Agent package scanner returned an invalid response."); }
  if (result.status !== 0 || parsed.error) throw fail(400, parsed.error || "Agent package validation failed.");
  return { status: parsed.securityStatus || "PENDING_SCAN", manifestPath: parsed.manifestPath };
}

async function githubArchive(repositoryUrl) {
  let parsed;
  try { parsed = new URL(repositoryUrl); } catch { throw fail(400, "Enter a valid GitHub repository URL."); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") throw fail(400, "Only public github.com repository URLs are supported.");
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || parts.some(part => part === "." || part === "..")) throw fail(400, "Use https://github.com/owner/repository.");
  const [owner, repo] = parts;
  const ref = parts.length >= 4 && parts[2] === "tree" ? parts.slice(3).join("/") : "HEAD";
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.replace(/\.git$/, ""))}/zipball/${encodeURIComponent(ref)}`;
  const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json", "User-Agent": "Nexus-Core-Agent-Marketplace" }, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw fail(400, response.status === 404 ? "Repository or branch not found. It must be public." : `GitHub import failed (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_ARCHIVE_BYTES || !isZip(buffer)) throw fail(413, "GitHub archive is invalid or exceeds the 25 MB limit.");
  return buffer;
}
function parseMultipartBody(contentType, body) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  const boundary = match?.[1] || match?.[2]?.trim();
  if (!boundary) throw fail(400, "Multipart boundary is missing.");
  const marker = Buffer.from(`--${boundary}`);
  const fields = {};
  let archive = null, files = 0, fieldCount = 0, cursor = body.indexOf(marker);
  while (cursor >= 0) {
    cursor += marker.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) break;
    if (body[cursor] === 13 && body[cursor + 1] === 10) cursor += 2;
    const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), cursor);
    if (headerEnd < 0) throw fail(400, "Malformed multipart upload.");
    const headers = body.subarray(cursor, headerEnd).toString("utf8");
    const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    const dataStart = headerEnd + 4;
    const next = body.indexOf(marker, dataStart);
    if (next < 0) throw fail(400, "Multipart closing boundary is missing.");
    const dataEnd = next >= 2 && body[next - 2] === 13 && body[next - 1] === 10 ? next - 2 : next;
    const value = body.subarray(dataStart, dataEnd);
    if (!name) throw fail(400, "Multipart field name is missing.");
    if (filename !== undefined) {
      files += 1;
      if (files > 1 || name !== "archive") throw fail(400, "Only one archive file is accepted.");
      if (value.length > MAX_ARCHIVE_BYTES) throw fail(413, "ZIP file exceeds the 25 MB limit.");
      archive = Buffer.from(value);
    } else {
      fieldCount += 1;
      if (fieldCount > 12) throw fail(400, "Too many form fields.");
      fields[name] = value.toString("utf8");
    }
    cursor = next;
  }
  return { fields, archive };
}

async function requireOwnedOrInstalled(userId, agentId) {
  const agent = await prisma.marketplaceAgent.findUnique({ where: { id: agentId } });
  if (!agent || agent.status !== "APPROVED") throw fail(404, "Approved agent not found.");
  if (agent.developer_id === userId) return agent;
  const install = await prisma.marketplaceInstall.findUnique({ where: { user_id_agent_id: { user_id: userId, agent_id: agentId } } });
  if (!install) throw fail(403, "Install or purchase this agent before using it.");
  return agent;
}

export async function marketplaceRoutes(app) {
  app.removeContentTypeParser("application/json");
  app.addContentTypeParser("application/json", { parseAs: "buffer" }, (req, body, done) => {
    req.rawBody = body;
    try { done(null, JSON.parse(body.toString("utf8"))); } catch (error) { done(error); }
  });
  app.addContentTypeParser("multipart/form-data", { parseAs: "buffer" }, (req, body, done) => {
    try { done(null, parseMultipartBody(req.headers["content-type"], body)); } catch (error) { done(error); }
  });
  app.get("/agents", async (req, reply) => {
    const { q = "", category = "all", limit = "60" } = req.query || {};
    const take = Math.min(Math.max(Number(limit) || 60, 1), 100);
    const where = { status: "APPROVED" };
    if (category !== "all" && allowedCategories.includes(category)) where.category = category;
    if (q.trim()) where.OR = [{ name: { contains: q.trim(), mode: "insensitive" } }, { description: { contains: q.trim(), mode: "insensitive" } }];
    const agents = await prisma.marketplaceAgent.findMany({ where, orderBy: { reviewed_at: "desc" }, take });
    const ratings = agents.length ? await prisma.marketplaceReview.groupBy({ by: ["agent_id"], where: { agent_id: { in: agents.map(agent => agent.id) } }, _avg: { rating: true }, _count: { _all: true } }) : [];
    const ratingMap = new Map(ratings.map(row => [row.agent_id, row]));
    return reply.send({ items: agents.map(agent => { const rating = ratingMap.get(agent.id); return { ...publicAgent(agent), ratingAverage: rating?._avg.rating || 0, reviewCount: rating?._count._all || 0 }; }) });
  });

  app.get("/mine", { preHandler: requireAuth }, async (req, reply) => {
    const [agents, account, purchases, installs] = await Promise.all([
      prisma.marketplaceAgent.findMany({ where: { developer_id: req.user.id }, orderBy: { submitted_at: "desc" } }),
      prisma.marketplaceDeveloperAccount.findUnique({ where: { user_id: req.user.id } }),
      prisma.marketplacePurchase.findMany({ where: { OR: [{ buyer_id: req.user.id }, { seller_id: req.user.id }] }, include: { agent: { select: { name: true, slug: true } } }, orderBy: { created_at: "desc" }, take: 100 }),
      prisma.marketplaceInstall.findMany({ where: { user_id: req.user.id }, include: { agent: { select: { id: true, name: true, slug: true } } }, orderBy: { created_at: "desc" } }),
    ]);
    return reply.send({ items: agents.map(publicAgent), developerAccount: account ? { country: account.country, detailsSubmitted: account.details_submitted, chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled } : null, purchases: purchases.map(p => ({ ...p, direction: p.buyer_id === req.user.id ? "PURCHASE" : "SALE" })), installs });
  });

  app.get("/developer/analytics", { preHandler: requireAuth }, async (req, reply) => {
    const agentIds = (await prisma.marketplaceAgent.findMany({ where: { developer_id: req.user.id }, select: { id: true, name: true } }));
    if (!agentIds.length) return reply.send({ items: [], totalExecutions: 0 });
    const ids = agentIds.map(agent => agent.id);
    const grouped = await prisma.marketplaceUsageRecord.groupBy({ by: ["agent_id"], where: { agent_id: { in: ids } }, _sum: { units: true }, _count: { _all: true } });
    const totals = new Map(grouped.map(row => [row.agent_id, row]));
    const items = agentIds.map(agent => ({ ...agent, executions: totals.get(agent.id)?._count._all || 0, units: totals.get(agent.id)?._sum.units || 0 }));
    return reply.send({ items, totalExecutions: items.reduce((sum, item) => sum + item.executions, 0) });
  });

  app.get("/agents/:id/reviews", async (req, reply) => {
    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
    if (!agent || agent.status !== "APPROVED") return reply.code(404).send({ error: "Agent not found." });
    const [items, aggregate] = await Promise.all([
      prisma.marketplaceReview.findMany({ where: { agent_id: agent.id }, include: { user: { select: { name: true } } }, orderBy: { created_at: "desc" }, take: 100 }),
      prisma.marketplaceReview.aggregate({ where: { agent_id: agent.id }, _avg: { rating: true }, _count: { _all: true } }),
    ]);
    return reply.send({ items, average: aggregate._avg.rating || 0, count: aggregate._count._all || 0 });
  });

  app.post("/agents/:id/reviews", { preHandler: requireAuth }, async (req, reply) => {
    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id } });
    if (!agent || agent.status !== "APPROVED") return reply.code(404).send({ error: "Agent not found." });
    const install = await prisma.marketplaceInstall.findUnique({ where: { user_id_agent_id: { user_id: req.user.id, agent_id: agent.id } } });
    if (!install || agent.developer_id === req.user.id) return reply.code(403).send({ error: "Only customers who installed this agent can review it." });
    const rating = Number(req.body?.rating), body = safeString(req.body?.body, 1000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return reply.code(400).send({ error: "Rating must be a whole number from 1 to 5." });
    const review = await prisma.marketplaceReview.upsert({ where: { user_id_agent_id: { user_id: req.user.id, agent_id: agent.id } }, create: { user_id: req.user.id, agent_id: agent.id, rating, body: body || null }, update: { rating, body: body || null } });
    return reply.send({ success: true, review });
  });

  app.post("/:id/versions/:versionId/activate", { preHandler: [requireAuth, requireRole("admin")] }, async (req, reply) => {
    const version = await prisma.marketplaceAgentVersion.findFirst({ where: { id: req.params.versionId, agent_id: req.params.id, status: "APPROVED" } });
    if (!version) return reply.code(404).send({ error: "Approved version not found." });
    const agent = await prisma.marketplaceAgent.update({ where: { id: version.agent_id }, data: { version: version.version, source: version.source, source_url: version.source_url, artifact_path: version.artifact_path, security_status: version.security_status } });
    return reply.send({ success: true, agent: publicAgent(agent), activatedVersion: version.version });
  });

  app.get("/agents/:id/versions", async (req, reply) => {
    const items = await prisma.marketplaceAgentVersion.findMany({ where: { agent_id: req.params.id, status: "APPROVED" }, select: { id: true, version: true, submitted_at: true, reviewed_at: true }, orderBy: { submitted_at: "desc" } });
    return reply.send({ items });
  });

  app.post("/agents/:id/versions", { preHandler: requireAuth }, async (req, reply) => {
    const agent = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id } });
    if (!agent || agent.developer_id !== req.user.id) return reply.code(404).send({ error: "Agent not found or not owned by you." });
    let fields = {}, archive = null, artifactPath = null, source = agent.source, sourceUrl = agent.source_url, securityStatus = "NOT_APPLICABLE";
    try {
      fields = req.body?.fields || {};
      archive = req.body?.archive || null;
      const version = safeString(fields.version, 32);
      if (!version || version === agent.version) throw fail(400, "Provide a new version number different from the current version.");
      if (agent.source === "API") { source = "API"; sourceUrl = await assertPublicHttpsUrl(safeString(fields.endpoint || agent.source_url, 500)); }
      else {
        if (!archive || !isZip(archive)) throw fail(400, "Upload a valid ZIP package for this version.");
        artifactPath = await storeArchive(archive);
        try { securityStatus = (await validateArchive(artifactPath)).status; } catch (error) { await unlink(artifactPath).catch(() => {}); artifactPath = null; throw error; }
        source = agent.source;
      }
      const versionRecord = await prisma.marketplaceAgentVersion.create({ data: { agent_id: agent.id, version, source, source_url: sourceUrl, artifact_path: artifactPath, security_status: securityStatus, status: "PENDING" } });
      return reply.code(201).send({ success: true, version: versionRecord, message: "Update submitted for security review." });
    } catch (error) { if (artifactPath) await unlink(artifactPath).catch(() => {}); return reply.code(error.statusCode || 500).send({ error: error.statusCode ? error.message : "Could not submit version." }); }
  });

  app.post("/:id/versions/:versionId/review", { preHandler: [requireAuth, requireRole("admin")] }, async (req, reply) => {
    const version = await prisma.marketplaceAgentVersion.findFirst({ where: { id: req.params.versionId, agent_id: req.params.id } });
    if (!version) return reply.code(404).send({ error: "Version not found." });
    const status = req.body?.status;
    if (!["APPROVED", "REJECTED"].includes(status)) return reply.code(400).send({ error: "Status must be APPROVED or REJECTED." });
    let securityStatus = version.security_status;
    if (status === "APPROVED" && version.artifact_path) {
      const scan = spawnSync("clamscan", ["--no-summary", version.artifact_path], { encoding: "utf8", timeout: 60000 });
      if (scan.status === 0) securityStatus = "CLEAN";
      else if (process.env.MARKETPLACE_ALLOW_UNSCANNED === "true" && scan.error?.code === "ENOENT") securityStatus = "MANUAL_OVERRIDE";
      else return reply.code(409).send({ error: "Version approval requires a clean ClamAV scan." });
    }
    await prisma.$transaction(async tx => {
      await tx.marketplaceAgentVersion.update({ where: { id: version.id }, data: { status, security_status: securityStatus, reviewed_at: new Date() } });
      if (status === "APPROVED") await tx.marketplaceAgent.update({ where: { id: version.agent_id }, data: { version: version.version, source: version.source, source_url: version.source_url, artifact_path: version.artifact_path, security_status: securityStatus } });
    });
    return reply.send({ success: true, status, securityStatus });
  });

  app.post("/submit", { preHandler: requireAuth }, async (req, reply) => {
    let fields = {}, archive = null, source = "ZIP", sourceUrl = null, artifactPath = null, securityStatus = "NOT_APPLICABLE";
    try {
      fields = req.body?.fields || {};
      archive = req.body?.archive || null;
      const name = safeString(fields.name, 80), description = safeString(fields.description, 2000);
      const category = allowedCategories.includes(fields.category) ? fields.category : "Other";
      const version = safeString(fields.version || "1.0.0", 32);
      const pricingModel = fields.pricingModel === "PAID" ? "PAID" : "FREE";
      const priceCents = pricingModel === "PAID" ? Math.round(Number(fields.price) * 100) : 0;
      if (name.length < 3 || description.length < 20) throw fail(400, "Agent name (3+ characters) and description (20+ characters) are required.");
      if (pricingModel === "PAID" && (!Number.isSafeInteger(priceCents) || priceCents < 100 || priceCents > 100000000)) throw fail(400, "Paid agents must cost between $1 and $1,000,000.");
      if (fields.source === "GITHUB") { source = "GITHUB"; sourceUrl = safeString(fields.githubUrl, 500); archive = await githubArchive(sourceUrl); }
      else if (fields.source === "API") { source = "API"; sourceUrl = await assertPublicHttpsUrl(safeString(fields.endpoint, 500)); }
      else { source = "ZIP"; if (!archive || !isZip(archive)) throw fail(400, "Upload a valid ZIP archive."); }
      if (archive) {
        artifactPath = await storeArchive(archive);
        try { const inspection = await validateArchive(artifactPath); securityStatus = inspection.status; }
        catch (error) { await unlink(artifactPath).catch(() => {}); artifactPath = null; throw error; }
      }
      const slug = `${slugify(name)}-${randomUUID().slice(0, 8)}`;
      const agent = await prisma.marketplaceAgent.create({ data: { developer_id: req.user.id, slug, name, description, category, version, source, source_url: sourceUrl, artifact_path: artifactPath, price_cents: priceCents, pricing_model: pricingModel, currency: "usd", status: "PENDING", security_status: securityStatus, manifest: { submittedVia: source, reviewRequired: true, archiveStored: Boolean(artifactPath) } } });
      return reply.code(201).send({ success: true, agent: publicAgent(agent), message: "Agent submitted for review. It will be listed after approval." });
    } catch (error) {
      if (artifactPath) await unlink(artifactPath).catch(() => {});
      req.log.error({ err: error }, "Marketplace submission failed");
      return reply.code(error.statusCode || 500).send({ error: error.statusCode ? error.message : "Could not submit this agent." });
    }
  });

  app.post("/developer/connect", { preHandler: requireAuth }, async (req, reply) => {
    if (!stripe) return reply.code(503).send({ error: "Stripe is not configured on the API." });
    const country = safeString(req.body?.country, 2).toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) return reply.code(400).send({ error: "Choose your two-letter country code." });
    try {
      let record = await prisma.marketplaceDeveloperAccount.findUnique({ where: { user_id: req.user.id } });
      if (!record) {
        const account = await stripe.accounts.create({ type: "express", country, email: req.user.email, capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, metadata: { nexusUserId: req.user.id } });
        record = await prisma.marketplaceDeveloperAccount.create({ data: { user_id: req.user.id, stripe_account_id: account.id, country, details_submitted: account.details_submitted, charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled } });
      } else if (record.country !== country) return reply.code(409).send({ error: "A connected account already exists for a different country. Contact marketplace support to change it." });
      const link = await stripe.accountLinks.create({ account: record.stripe_account_id, refresh_url: `${FRONTEND_URL}/agents?tab=dashboard&connect=refresh`, return_url: `${FRONTEND_URL}/agents?tab=dashboard&connect=return`, type: "account_onboarding" });
      return reply.send({ url: link.url });
    } catch (error) { req.log.error({ err: error }, "Stripe Connect onboarding failed"); return reply.code(400).send({ error: error.message || "Could not start seller onboarding." }); }
  });

  app.post("/developer/dashboard-link", { preHandler: requireAuth }, async (req, reply) => {
    if (!stripe) return reply.code(503).send({ error: "Stripe is not configured on the API." });
    const account = await prisma.marketplaceDeveloperAccount.findUnique({ where: { user_id: req.user.id } });
    if (!account) return reply.code(404).send({ error: "Complete seller onboarding first." });
    try {
      const login = await stripe.accounts.createLoginLink(account.stripe_account_id);
      return reply.send({ url: login.url });
    } catch (error) { return reply.code(400).send({ error: error.message || "Could not open the Stripe Express dashboard." }); }
  });

  app.post("/agents/:id/checkout", { preHandler: requireAuth }, async (req, reply) => {
    if (!stripe) return reply.code(503).send({ error: "Stripe is not configured on the API." });
    try {
      const agent = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id } });
      if (!agent || agent.status !== "APPROVED") throw fail(404, "Approved agent not found.");
      if (agent.pricing_model !== "PAID" || agent.price_cents < 100) throw fail(400, "This agent is not a paid listing.");
      if (agent.developer_id === req.user.id) throw fail(400, "You cannot purchase your own agent.");
      const seller = await prisma.marketplaceDeveloperAccount.findUnique({ where: { user_id: agent.developer_id } });
      if (!seller?.charges_enabled || !seller?.payouts_enabled) throw fail(409, "The developer has not completed Stripe seller onboarding.");
      const fee = Math.round(agent.price_cents * COMMISSION_BPS / 10000);
      const purchase = await prisma.marketplacePurchase.create({ data: { buyer_id: req.user.id, seller_id: agent.developer_id, agent_id: agent.id, amount_cents: agent.price_cents, platform_fee_cents: fee, currency: agent.currency.toLowerCase(), status: "PENDING" } });
      const session = await stripe.checkout.sessions.create({ mode: "payment", payment_method_types: ["card"], customer_email: req.user.email, line_items: [{ quantity: 1, price_data: { currency: agent.currency.toLowerCase(), unit_amount: agent.price_cents, product_data: { name: agent.name, description: agent.description.slice(0, 500) } } }], payment_intent_data: { application_fee_amount: fee, transfer_data: { destination: seller.stripe_account_id }, metadata: { marketplacePurchaseId: purchase.id, agentId: agent.id, buyerId: req.user.id, sellerId: agent.developer_id } }, metadata: { marketplacePurchaseId: purchase.id, agentId: agent.id }, success_url: `${FRONTEND_URL}/agents?purchase=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${FRONTEND_URL}/agents?purchase=cancelled` });
      await prisma.marketplacePurchase.update({ where: { id: purchase.id }, data: { checkout_session_id: session.id } });
      return reply.send({ url: session.url });
    } catch (error) { req.log.error({ err: error }, "Marketplace checkout failed"); return reply.code(error.statusCode || 500).send({ error: error.statusCode ? error.message : "Could not create checkout session." }); }
  });

  app.post("/agents/:id/install", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const agent = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id } });
      if (!agent || agent.status !== "APPROVED") throw fail(404, "Approved agent not found.");
      if (agent.developer_id !== req.user.id && agent.pricing_model === "PAID") {
        const purchase = await prisma.marketplacePurchase.findFirst({ where: { buyer_id: req.user.id, agent_id: agent.id, status: "PAID" } });
        if (!purchase) throw fail(402, "Purchase this agent before installing it.");
      }
      const install = await prisma.marketplaceInstall.upsert({ where: { user_id_agent_id: { user_id: req.user.id, agent_id: agent.id } }, create: { user_id: req.user.id, agent_id: agent.id }, update: {} });
      return reply.code(201).send({ success: true, install });
    } catch (error) { return reply.code(error.statusCode || 500).send({ error: error.statusCode ? error.message : "Could not install agent." }); }
  });

  app.post("/agents/:id/execute", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const agent = await requireOwnedOrInstalled(req.user.id, req.params.id);
      const input = req.body?.input ?? {};
      if (Buffer.byteLength(JSON.stringify(input)) > MAX_INPUT_BYTES) throw fail(413, "Execution input is limited to 64 KB.");
      if (agent.source === "ZIP" || agent.source === "GITHUB") {
        if (agent.security_status !== "CLEAN" && process.env.MARKETPLACE_ALLOW_UNSCANNED !== "true") throw fail(409, "This agent package has not passed the required ClamAV security scan.");
        if (process.env.MARKETPLACE_DOCKER_ENABLED !== "true") throw fail(503, "Isolated execution is not enabled. Configure the dedicated marketplace worker and Docker runtime first.");
      }
      const execution = await prisma.marketplaceExecution.create({ data: { user_id: req.user.id, agent_id: agent.id, input, status: "QUEUED" } });
      return reply.code(202).send({ executionId: execution.id, status: execution.status, message: "Execution queued." });
    } catch (error) { return reply.code(error.statusCode || 500).send({ error: error.statusCode ? error.message : "Could not queue agent execution." }); }
  });

  app.get("/executions/:id", { preHandler: requireAuth }, async (req, reply) => {
    const execution = await prisma.marketplaceExecution.findFirst({ where: { id: req.params.id, user_id: req.user.id } });
    if (!execution) return reply.code(404).send({ error: "Execution not found." });
    return reply.send({ execution });
  });

  app.post("/purchases/:id/refund", { preHandler: [requireAuth, requireRole("admin")] }, async (req, reply) => {
    if (!stripe) return reply.code(503).send({ error: "Stripe is not configured." });
    const purchase = await prisma.marketplacePurchase.findUnique({ where: { id: req.params.id } });
    if (!purchase || purchase.status !== "PAID" || !purchase.payment_intent_id) return reply.code(409).send({ error: "Only paid purchases can be refunded." });
    try {
      const refund = await stripe.refunds.create({ payment_intent: purchase.payment_intent_id, reverse_transfer: true, refund_application_fee: true, reason: "requested_by_customer", metadata: { marketplacePurchaseId: purchase.id } });
      await prisma.marketplacePurchase.update({ where: { id: purchase.id }, data: { status: "REFUND_PENDING" } });
      return reply.send({ success: true, refundId: refund.id, status: refund.status });
    } catch (error) { return reply.code(400).send({ error: error.message || "Refund could not be created." }); }
  });

  app.get("/review-queue", { preHandler: [requireAuth, requireRole("admin")] }, async (_req, reply) => {
    const agents = await prisma.marketplaceAgent.findMany({ where: { status: "PENDING" }, include: { developer: { select: { id: true, name: true, email: true } } }, orderBy: { submitted_at: "asc" }, take: 100 });
    return reply.send({ items: agents.map(agent => ({ ...publicAgent(agent), developer: agent.developer })) });
  });

  app.post("/:id/review", { preHandler: [requireAuth, requireRole("admin")] }, async (req, reply) => {
    const { status, reason } = req.body || {};
    if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) return reply.code(400).send({ error: "Invalid review status." });
    const existing = await prisma.marketplaceAgent.findUnique({ where: { id: req.params.id } });
    if (!existing) return reply.code(404).send({ error: "Agent not found." });
    let securityStatus = existing.security_status;
    if (status === "APPROVED" && existing.artifact_path) {
      const result = spawnSync("clamscan", ["--no-summary", existing.artifact_path], { encoding: "utf8", timeout: 60000 });
      if (result.status === 0) securityStatus = "CLEAN";
      else if (process.env.MARKETPLACE_ALLOW_UNSCANNED === "true" && result.error?.code === "ENOENT") securityStatus = "MANUAL_OVERRIDE";
      else return reply.code(409).send({ error: "Approval blocked: install ClamAV and obtain a clean scan, or explicitly enable MARKETPLACE_ALLOW_UNSCANNED for a non-production test environment." });
    }
    const updated = await prisma.marketplaceAgent.update({ where: { id: existing.id }, data: { status, security_status: securityStatus, rejection_reason: status === "REJECTED" ? safeString(reason, 1000) : null, reviewed_at: new Date(), reviewer_id: req.user.id } });
    return reply.send({ success: true, agent: publicAgent(updated) });
  });

  // Stripe sends raw JSON here; signature verification is performed before parsing or processing.
  app.post("/webhook", async (req, reply) => {
    if (!stripe || !process.env.MARKETPLACE_STRIPE_WEBHOOK_SECRET) return reply.code(503).send({ error: "Marketplace Stripe webhook is not configured." });
    let event;
    try { event = stripe.webhooks.constructEvent(req.rawBody, req.headers["stripe-signature"], process.env.MARKETPLACE_STRIPE_WEBHOOK_SECRET); }
    catch (error) { return reply.code(400).send({ error: `Invalid Stripe signature: ${error.message}` }); }
    try {
      await prisma.marketplaceWebhookEvent.create({ data: { stripe_event_id: event.id, event_type: event.type } });
    } catch (error) {
      if (error.code === "P2002") return reply.send({ received: true, duplicate: true });
      throw error;
    }
    try {
      const object = event.data.object;
      if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type) && object.metadata?.marketplacePurchaseId) {
        const purchaseId = object.metadata.marketplacePurchaseId;
        await prisma.$transaction(async tx => {
          const purchase = await tx.marketplacePurchase.findUnique({ where: { id: purchaseId } });
          if (!purchase || purchase.status === "PAID") return;
          await tx.marketplacePurchase.update({ where: { id: purchaseId }, data: { status: "PAID", payment_intent_id: typeof object.payment_intent === "string" ? object.payment_intent : null } });
          await tx.marketplaceInstall.upsert({ where: { user_id_agent_id: { user_id: purchase.buyer_id, agent_id: purchase.agent_id } }, create: { user_id: purchase.buyer_id, agent_id: purchase.agent_id }, update: {} });
        });
      } else if (event.type === "checkout.session.expired" && object.metadata?.marketplacePurchaseId) {
        await prisma.marketplacePurchase.updateMany({ where: { id: object.metadata.marketplacePurchaseId, status: "PENDING" }, data: { status: "EXPIRED" } });
      } else if (event.type === "charge.refunded") {
        const paymentIntent = typeof object.payment_intent === "string" ? object.payment_intent : null;
        if (paymentIntent) {
          const purchase = await prisma.marketplacePurchase.findUnique({ where: { payment_intent_id: paymentIntent } });
          if (purchase) {
            await prisma.marketplacePurchase.update({ where: { id: purchase.id }, data: { status: object.refunded ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
            if (object.refunded) await prisma.marketplaceInstall.deleteMany({ where: { user_id: purchase.buyer_id, agent_id: purchase.agent_id } });
          }
        }
      } else if (event.type === "account.updated") {
        await prisma.marketplaceDeveloperAccount.updateMany({ where: { stripe_account_id: object.id }, data: { details_submitted: object.details_submitted, charges_enabled: object.charges_enabled, payouts_enabled: object.payouts_enabled } });
      }
    } catch (error) {
      await prisma.marketplaceWebhookEvent.delete({ where: { stripe_event_id: event.id } }).catch(() => {});
      req.log.error({ err: error, stripeEventId: event.id }, "Marketplace webhook processing failed");
      return reply.code(500).send({ error: "Webhook processing failed; Stripe may retry." });
    }
    return reply.send({ received: true });
  });
}
