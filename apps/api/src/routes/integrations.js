import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../security/authMiddleware.js";

const createSchema = z.object({
  name: z.string().trim().min(2).max(60).regex(/^[\p{L}\p{N} ._'-]+$/u, "Use a simple integration name."),
});
const eventSchema = z.object({
  type: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().default(""),
  department: z.enum(["grow", "sell", "serve", "operate"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const safeName = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "app";

async function workspaceId(req, reply) {
  const orgId = req.user?.org_id;
  if (!orgId) {
    reply.code(409).send({ error: "BUSINESS_WORKSPACE_REQUIRED", message: "Your account is not assigned to a business workspace." });
    return null;
  }
  return orgId;
}

async function requireWorkspaceAdmin(req, reply) {
  const orgId = await workspaceId(req, reply);
  if (!orgId) return false;
  const [org, membership] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { owner_id: true } }),
    prisma.membership.findUnique({ where: { org_id_user_id: { org_id: orgId, user_id: req.user.id } }, select: { org_role: true } }),
  ]);
  const allowed = org?.owner_id === req.user.id || ["owner", "admin"].includes(membership?.org_role);
  if (!allowed) {
    reply.code(403).send({ error: "WORKSPACE_ADMIN_REQUIRED", message: "Only workspace owners and administrators can manage integrations." });
    return false;
  }
  return true;
}

async function authenticateIntegration(req, reply) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token.startsWith("nx_int_") || token.length < 40) {
    reply.code(401).send({ error: "INTEGRATION_TOKEN_REQUIRED" });
    return null;
  }
  const credential = await prisma.integrationCredential.findUnique({ where: { token_hash: digest(token) } });
  if (!credential || credential.revoked_at || !credential.scopes.includes("events:write")) {
    reply.code(401).send({ error: "INTEGRATION_TOKEN_INVALID" });
    return null;
  }
  await prisma.integrationCredential.update({ where: { id: credential.id }, data: { last_used_at: new Date() } });
  return credential;
}

export async function integrationsRoutes(app) {
  // List and create integration credentials. Secrets are only returned at creation time.
  app.get("/", { preHandler: [requireAuth, requireWorkspaceAdmin] }, async (req, reply) => {
    const orgId = await workspaceId(req, reply);
    if (!orgId) return;
    const items = await prisma.integrationCredential.findMany({ where: { org_id: orgId }, orderBy: { created_at: "desc" } });
    return { success: true, integrations: items.map(({ id, name, token_prefix, scopes, last_used_at, revoked_at, created_at }) => ({ id, name, tokenPrefix: token_prefix, scopes, lastUsedAt: last_used_at, revokedAt: revoked_at, createdAt: created_at })) };
  });

  app.post("/", { preHandler: [requireAuth, requireWorkspaceAdmin] }, async (req, reply) => {
    const orgId = await workspaceId(req, reply);
    if (!orgId) return;
    const parsed = createSchema.safeParse(req.body || {});
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INTEGRATION", details: parsed.error.issues.map((issue) => issue.message) });
    const name = parsed.data.name;
    const token = `nx_int_${crypto.randomBytes(32).toString("base64url")}`;
    const record = await prisma.integrationCredential.create({ data: {
      org_id: orgId,
      name,
      slug: safeName(name),
      token_prefix: token.slice(0, 14),
      token_hash: digest(token),
      scopes: ["events:write"],
      created_by: req.user.id,
    } });
    return reply.code(201).send({ success: true, integration: { id: record.id, name: record.name, tokenPrefix: record.token_prefix, scopes: record.scopes, createdAt: record.created_at }, token });
  });

  app.delete("/:id", { preHandler: [requireAuth, requireWorkspaceAdmin] }, async (req, reply) => {
    const orgId = await workspaceId(req, reply);
    if (!orgId) return;
    const result = await prisma.integrationCredential.updateMany({ where: { id: req.params.id, org_id: orgId, revoked_at: null }, data: { revoked_at: new Date() } });
    if (!result.count) return reply.code(404).send({ error: "INTEGRATION_NOT_FOUND" });
    return { success: true, revoked: true };
  });

  // Third-party products call this endpoint with an integration token. The tenant and
  // source are derived from the credential, never from caller-controlled request fields.
  app.post("/events", async (req, reply) => {
    const credential = await authenticateIntegration(req, reply);
    if (!credential) return;
    const parsed = eventSchema.safeParse(req.body || {});
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BUSINESS_EVENT", details: parsed.error.issues.map((issue) => issue.message) });
    const value = parsed.data;
    if (Buffer.byteLength(JSON.stringify(value.metadata), "utf8") > 8192) {
      return reply.code(400).send({ error: "EVENT_METADATA_TOO_LARGE", message: "Event metadata must be 8 KB or smaller." });
    }
    const event = await prisma.businessActivity.create({ data: {
      org_id: credential.org_id,
      user_id: null,
      event_type: value.type,
      title: value.title,
      description: value.description || null,
      source: `integration:${credential.slug}`,
      department: value.department || null,
      metadata: value.metadata,
    } });
    return reply.code(201).send({ success: true, event: { id: event.id, createdAt: event.created_at, source: event.source } });
  });
}
