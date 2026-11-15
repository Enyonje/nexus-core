import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../security/authMiddleware.js";

const profileSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  industry: z.string().trim().min(1).max(60),
  size: z.string().trim().min(1).max(30),
  website: z.string().trim().max(200).optional().default(""),
  goals: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
});

const eventSchema = z.object({
  type: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().default(""),
  source: z.string().trim().min(2).max(60),
  department: z.enum(["grow", "sell", "serve", "operate"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

function requireWorkspace(req, reply) {
  const orgId = req.user?.org_id;
  if (!orgId) {
    reply.code(409).send({
      error: "BUSINESS_WORKSPACE_REQUIRED",
      message: "Your account is not assigned to a business workspace. Contact your workspace administrator.",
    });
    return null;
  }
  return orgId;
}

function publicProfile(profile) {
  if (!profile) return null;
  return {
    businessName: profile.business_name,
    industry: profile.industry,
    size: profile.team_size,
    website: profile.website || "",
    goals: Array.isArray(profile.goals) ? profile.goals : [],
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export async function businessRoutes(app) {
  app.get("/profile", { preHandler: requireAuth }, async (req, reply) => {
    const orgId = requireWorkspace(req, reply);
    if (!orgId) return;
    const profile = await prisma.businessProfile.findUnique({ where: { org_id: orgId } });
    return { success: true, profile: publicProfile(profile) };
  });

  app.put("/profile", { preHandler: requireAuth }, async (req, reply) => {
    const orgId = requireWorkspace(req, reply);
    if (!orgId) return;
    const parsed = profileSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_BUSINESS_PROFILE", details: parsed.error.issues.map(issue => issue.message) });
    }
    const value = parsed.data;
    const profile = await prisma.businessProfile.upsert({
      where: { org_id: orgId },
      create: {
        org_id: orgId,
        business_name: value.businessName,
        industry: value.industry,
        team_size: value.size,
        website: value.website || null,
        goals: value.goals,
        updated_by: req.user.id,
      },
      update: {
        business_name: value.businessName,
        industry: value.industry,
        team_size: value.size,
        website: value.website || null,
        goals: value.goals,
        updated_by: req.user.id,
      },
    });
    return { success: true, profile: publicProfile(profile) };
  });

  app.get("/overview", { preHandler: requireAuth }, async (req, reply) => {
    const orgId = requireWorkspace(req, reply);
    if (!orgId) return;
    const [profile, goals, executions, recentEvents] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { org_id: orgId } }),
      prisma.goal.count({ where: { org_id: orgId, deleted_at: null } }),
      prisma.execution.groupBy({ by: ["status"], where: { org_id: orgId, deleted_at: null }, _count: { _all: true } }),
      prisma.businessActivity.findMany({ where: { org_id: orgId }, orderBy: { created_at: "desc" }, take: 8 }),
    ]);
    const executionCounts = Object.fromEntries(executions.map(row => [String(row.status).toLowerCase(), row._count._all]));
    return {
      success: true,
      profile: publicProfile(profile),
      metrics: {
        businessGoals: goals,
        totalExecutions: Object.values(executionCounts).reduce((sum, count) => sum + count, 0),
        runningExecutions: executionCounts.running || 0,
        completedExecutions: executionCounts.completed || 0,
        failedExecutions: executionCounts.failed || 0,
      },
      recentActivity: recentEvents.map(event => ({
        id: event.id, type: event.event_type, title: event.title,
        description: event.description, source: event.source,
        department: event.department, createdAt: event.created_at,
      })),
    };
  });

  // Shared event contract for trusted Nexus-authenticated applications.
  // Each event is always assigned to the caller's verified organization.
  app.post("/events", { preHandler: requireAuth }, async (req, reply) => {
    const orgId = requireWorkspace(req, reply);
    if (!orgId) return;
    const parsed = eventSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return reply.code(400).send({ error: "INVALID_BUSINESS_EVENT", details: parsed.error.issues.map(issue => issue.message) });
    }
    const event = await prisma.businessActivity.create({
      data: {
        org_id: orgId,
        user_id: req.user.id,
        event_type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description || null,
        source: parsed.data.source,
        department: parsed.data.department || null,
        metadata: parsed.data.metadata,
      },
    });
    return reply.code(201).send({ success: true, event: { id: event.id, createdAt: event.created_at } });
  });
}
