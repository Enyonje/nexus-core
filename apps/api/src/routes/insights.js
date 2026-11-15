import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../security/authMiddleware.js";

const querySchema = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });

function dayKey(value) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export async function insightsRoutes(app) {
  app.get("/", { preHandler: requireAuth }, async (req, reply) => {
    const orgId = req.user?.org_id;
    if (!orgId) return reply.code(409).send({ error: "BUSINESS_WORKSPACE_REQUIRED", message: "Your account is not assigned to a business workspace." });
    const parsed = querySchema.safeParse(req.query || {});
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INSIGHTS_RANGE" });

    const days = parsed.data.days;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [activities, executions, goals, profile] = await Promise.all([
      prisma.businessActivity.findMany({
        where: { org_id: orgId, created_at: { gte: since } },
        orderBy: { created_at: "asc" }, take: 5000,
        select: { id: true, event_type: true, title: true, source: true, department: true, created_at: true },
      }),
      prisma.execution.findMany({
        where: { org_id: orgId, deleted_at: null, created_at: { gte: since } },
        orderBy: { created_at: "asc" }, take: 5000,
        select: { id: true, status: true, created_at: true, finished_at: true },
      }),
      prisma.goal.count({ where: { org_id: orgId, deleted_at: null } }),
      prisma.businessProfile.findUnique({ where: { org_id: orgId }, select: { business_name: true, industry: true } }),
    ]);

    const timeline = new Map();
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + offset);
      const key = dayKey(date);
      timeline.set(key, { date: key, activity: 0, executions: 0, completed: 0, failed: 0 });
    }
    const departments = new Map();
    const sources = new Map();
    for (const event of activities) {
      const row = timeline.get(dayKey(event.created_at));
      if (row) row.activity += 1;
      const department = event.department || "unassigned";
      departments.set(department, (departments.get(department) || 0) + 1);
      const source = event.source || "unknown";
      sources.set(source, (sources.get(source) || 0) + 1);
    }
    let completed = 0;
    let failed = 0;
    let running = 0;
    for (const execution of executions) {
      const row = timeline.get(dayKey(execution.created_at));
      if (row) row.executions += 1;
      const status = String(execution.status || "").toLowerCase();
      if (status === "completed" || status === "success" || status === "succeeded") {
        completed += 1;
        if (row) row.completed += 1;
      } else if (status === "failed" || status === "error") {
        failed += 1;
        if (row) row.failed += 1;
      } else if (["running", "processing", "queued", "pending"].includes(status)) running += 1;
    }

    const total = executions.length;
    const successRate = total ? Math.round((completed / total) * 100) : null;
    const recommendations = [];
    if (!total && !activities.length) recommendations.push({ id: "activate", priority: "high", title: "Activate your workspace", detail: "Create your first workflow and connect a business channel to start generating measurable activity.", action: "Create a workflow", href: "/goals" });
    if (failed >= 3 || (total >= 5 && failed / total >= 0.2)) recommendations.push({ id: "reliability", priority: "high", title: "Review failed workflow runs", detail: `${failed} runs failed in this period. Inspect execution history to identify recurring errors before scaling automation.`, action: "Review executions", href: "/executions" });
    if (!departments.has("grow")) recommendations.push({ id: "growth", priority: "medium", title: "Start measuring growth activity", detail: "No Grow department events were recorded in this period. Connect your marketing workflow to make growth work visible.", action: "Explore growth tools", href: "/agents" });
    if (goals === 0) recommendations.push({ id: "goals", priority: "medium", title: "Define a repeatable business process", detail: "You have no active business workflows yet. Start with one recurring process that consumes team time.", action: "Create a workflow", href: "/goals" });
    if (activities.length && departments.size === 1) recommendations.push({ id: "coverage", priority: "low", title: "Expand your business visibility", detail: "Activity is currently recorded in one department. Add events from other departments as integrations become available.", action: "Explore the ecosystem", href: "/agents" });

    return {
      success: true,
      range: { days, from: since.toISOString(), to: new Date().toISOString() },
      business: profile ? { name: profile.business_name, industry: profile.industry } : null,
      metrics: {
        totalActivity: activities.length,
        totalExecutions: total,
        completedExecutions: completed,
        failedExecutions: failed,
        runningExecutions: running,
        successRate,
        activeDepartments: departments.size,
        businessWorkflows: goals,
      },
      timeline: [...timeline.values()],
      departments: [...departments.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      sources: [...sources.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      recommendations,
      dataNote: "Insights are calculated from Nexus Core workspace activity and workflow execution records. External products are not included unless an authorised integration sends events to this workspace.",
    };
  });
}
