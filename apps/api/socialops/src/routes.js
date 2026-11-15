import { z } from "zod";
import { prisma } from "./db.js";
import { providers } from "./providers.js";
import { agentRegistry, workflowRegistry } from "./agents/registry.js";
import { runAgent, runWorkflow, providerStatus } from "./agents/engine.js";
import { oauthStatus } from "./oauth-providers.js";

const platforms = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "X", "PINTEREST", "THREADS"];
export async function routes(app) {
    app.get("/api/v1/health", async () => ({ ok: true, service: "socialops-api" }));
    app.get("/api/v1/ready", async () => { await prisma.$queryRaw`SELECT 1`; return { ready: true }; });
    app.post("/api/v1/bootstrap", async (req, rep) => { const x = z.object({ organizationName: z.string().min(2), workspaceName: z.string().min(2) }).parse(req.body); const o = await prisma.organization.create({ data: { name: x.organizationName, workspaces: { create: { name: x.workspaceName } } }, include: { workspaces: true } }); return rep.code(201).send({ organizationId: o.id, workspace: o.workspaces[0] }); });
    app.get("/api/v1/providers", async () => providers);
    app.get("/api/v1/workspaces/:wid/summary", async req => { const w = req.params.wid; const [content, accounts, queued, approvals, unreadInteractions] = await Promise.all([prisma.contentItem.count({ where: { workspaceId: w } }), prisma.socialAccount.count({ where: { workspaceId: w, isActive: true } }), prisma.publication.count({ where: { workspaceId: w, status: "QUEUED" } }), prisma.approval.count({ where: { workspaceId: w, status: "PENDING" } }), prisma.socialInteraction.count({ where: { workspaceId: w, isRead: false } })]); return { content, accounts, queued, approvals, unreadInteractions }; });
    app.get("/api/v1/workspaces/:wid/accounts", req => prisma.socialAccount.findMany({ where: { workspaceId: req.params.wid }, select: { id: true, platform: true, accountName: true, isDevelopment: true, isActive: true, createdAt: true } }));
    app.post("/api/v1/workspaces/:wid/accounts/dev-connect", async (req, rep) => { if (process.env.NODE_ENV === "production") return rep.code(404).send({ error: "Not found" }); const x = z.object({ platform: z.enum(platforms), accountName: z.string().min(1) }).parse(req.body); const a = await prisma.socialAccount.upsert({ where: { workspaceId_platform_accountName: { workspaceId: req.params.wid, ...x } }, create: { workspaceId: req.params.wid, ...x, isDevelopment: true }, update: { isActive: true } }); return rep.code(201).send({ id: a.id, platform: a.platform, accountName: a.accountName, isDevelopment: true }); });
    app.get("/api/v1/workspaces/:wid/content", req => prisma.contentItem.findMany({ where: { workspaceId: req.params.wid }, orderBy: { updatedAt: "desc" } }));
    app.post("/api/v1/workspaces/:wid/content", async (req, rep) => { const x = z.object({ title: z.string().min(1), body: z.string().default("") }).parse(req.body); return rep.code(201).send(await prisma.contentItem.create({ data: { workspaceId: req.params.wid, ...x } })); });
    app.post("/api/v1/content/:id/request-approval", async (req, rep) => { const c = await prisma.contentItem.findUniqueOrThrow({ where: { id: req.params.id } }); await prisma.contentItem.update({ where: { id: c.id }, data: { status: "IN_REVIEW" } }); return rep.code(201).send(await prisma.approval.create({ data: { workspaceId: c.workspaceId, contentId: c.id } })); });
    app.get("/api/v1/workspaces/:wid/approvals", req => prisma.approval.findMany({ where: { workspaceId: req.params.wid, status: "PENDING" } }));
    app.post("/api/v1/approvals/:id/decision", async req => { const x = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().optional() }).parse(req.body); const a = await prisma.approval.update({ where: { id: req.params.id }, data: { status: x.decision, note: x.note, decidedAt: new Date() } }); await prisma.contentItem.update({ where: { id: a.contentId }, data: { status: x.decision === "APPROVED" ? "APPROVED" : "DRAFT" } }); return a; });
    app.post("/api/v1/workspaces/:wid/schedule", async (req, rep) => { const x = z.object({ contentItemId: z.string(), socialAccountId: z.string().optional(), scheduledAt: z.string().datetime() }).parse(req.body); const c = await prisma.contentItem.findFirstOrThrow({ where: { id: x.contentItemId, workspaceId: req.params.wid } }); if (c.status !== "APPROVED") return rep.code(409).send({ error: "Content must be approved before scheduling" }); const p = await prisma.publication.create({ data: { workspaceId: req.params.wid, contentItemId: c.id, socialAccountId: x.socialAccountId, scheduledAt: new Date(x.scheduledAt) } }); await prisma.contentItem.update({ where: { id: c.id }, data: { status: "SCHEDULED", scheduledAt: new Date(x.scheduledAt) } }); return rep.code(201).send(p); });
    app.get("/api/v1/workspaces/:wid/calendar", req => prisma.publication.findMany({ where: { workspaceId: req.params.wid }, include: { contentItem: true, socialAccount: true }, orderBy: { scheduledAt: "asc" } }));
    //app.post("/api/v1/workspaces/:wid/agents/run", async (req, rep) => { const x = z.object({ agent: z.string(), task: z.string().min(3) }).parse(req.body); return rep.code(201).send(await prisma.agentRun.create({ data: { workspaceId: req.params.wid, ...x, result: "Task recorded. Connect a model provider to execute AI generation." } })); });
    app.get("/api/v1/workspaces/:wid/agents/runs", req => prisma.agentRun.findMany({ where: { workspaceId: req.params.wid }, orderBy: { createdAt: "desc" } }));
    app.get("/api/v1/workspaces/:wid/inbox", req => prisma.socialInteraction.findMany({ where: { workspaceId: req.params.wid }, orderBy: { receivedAt: "desc" } }));
    app.get("/api/v1/workspaces/:wid/analytics", req => prisma.analyticsSnapshot.findMany({ where: { workspaceId: req.params.wid }, orderBy: { capturedAt: "desc" } }));

    // AI AGENTS
    app.get("/api/v1/agents", async () => ({
        agents: agentRegistry,
        workflows: workflowRegistry,
        provider: providerStatus()
    }));

    app.post("/api/v1/workspaces/:wid/agents/run", async (req, rep) => {
        const data = z.object({
            agent: z.string(),
            task: z.string().min(3),
            context: z.string().optional()
        }).parse(req.body);

        try {
            return rep.code(201).send(await runAgent({
                workspaceId: req.params.wid,
                ...data
            }));
        } catch (error) {
            return rep.code(400).send({ error: error.message });
        }
    });

    app.post("/api/v1/workspaces/:wid/agents/workflow", async (req, rep) => {
        const data = z.object({
            workflow: z.string(),
            task: z.string().min(3),
            context: z.string().optional()
        }).parse(req.body);

        try {
            return rep.code(201).send(await runWorkflow({
                workspaceId: req.params.wid,
                ...data
            }));
        } catch (error) {
            return rep.code(400).send({ error: error.message });
        }
    });

    // OAUTH STATUS
    app.get("/api/v1/oauth/status", async () => ({
        providers: oauthStatus()
    }));

    // AUTOMATIONS
    app.get("/api/v1/workspaces/:wid/automations", async req => {
        return prisma.automation.findMany({
            where: { workspaceId: req.params.wid },
            orderBy: { createdAt: "desc" }
        });
    });

    app.post("/api/v1/workspaces/:wid/automations", async (req, rep) => {
        const data = z.object({
            name: z.string().min(2),
            kind: z.enum(["AGENT", "WORKFLOW"]),
            target: z.string(),
            task: z.string().min(3),
            context: z.string().optional().default(""),
            intervalMinutes: z.number().int().min(1)
        }).parse(req.body);

        const automation = await prisma.automation.create({
            data: {
                workspaceId: req.params.wid,
                ...data,
                isActive: true,
                nextRunAt: new Date(Date.now() + data.intervalMinutes * 60000)
            }
        });

        return rep.code(201).send(automation);
    });

    app.patch("/api/v1/automations/:id", async (req, rep) => {
        const data = z.object({
            isActive: z.boolean().optional(),
            intervalMinutes: z.number().int().min(1).optional()
        }).parse(req.body);

        return prisma.automation.update({
            where: { id: req.params.id },
            data
        });
    });

    app.delete("/api/v1/automations/:id", async (req, rep) => {
        await prisma.automation.delete({
            where: { id: req.params.id }
        });

        return rep.code(204).send();
    });
}
