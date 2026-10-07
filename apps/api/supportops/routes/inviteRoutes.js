// apps/api/supportops/routes/inviteRoutes.js  Team invites + members.  Mount: "/api/v1/supportops/invites"
// Env: APP_URL (frontend address). Optional email delivery: POSTMARK_TOKEN + INVITE_FROM.
import { prisma, requireAuth } from "../lib/deps.js";
import { guard } from "../security/entitlements.js";
import { effectiveLimit, seatsAvailable } from "../security/entitlementRules.js";
import { hashToken, inviteExpiry, inviteProblem, newToken, normEmail, roleAllowed, validEmail } from "./inviteRules.js";

async function sendInviteEmail(to, orgName, role, link) {
    if (!process.env.POSTMARK_TOKEN || !process.env.INVITE_FROM) return false; // admin can still copy the link
    try {
        const res = await fetch("https://api.postmarkapp.com/email", {
            method: "POST",
            headers: { "X-Postmark-Server-Token": process.env.POSTMARK_TOKEN, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                From: process.env.INVITE_FROM, To: to, Subject: `You're invited to join ${orgName} on SupportOps`,
                TextBody: `You've been invited to join ${orgName} on SupportOps as ${role}.\n\nAccept the invitation: ${link}\n\nThe link expires in 7 days.`, MessageStream: "outbound"
            }),
            signal: AbortSignal.timeout(10000),
        });
        return res.ok;
    } catch { return false; }
}

export default async function inviteRoutes(app) {
    const admin = guard({ app: "supportops", roles: ["admin"] });
    const seatsUsed = async (orgId, appId) =>
        (await prisma.appAccess.count({ where: { org_id: orgId, app_id: appId } })) +
        (await prisma.invite.count({ where: { org_id: orgId, app_id: appId, status: "pending", expires_at: { gt: new Date() } } }));

    /* ---------- admin: invite people ---------- */
    app.post("/", { preHandler: admin }, async (req, reply) => {
        const email = normEmail(req.body?.email);
        const role = req.body?.role;
        if (!validEmail(email) || !roleAllowed(role)) return reply.code(400).send({ message: "Enter a valid email and choose Agent, Management or Investor" });

        const orgId = req.access.org.id, appId = req.access.app.id;
        const limit = req.access.limit("seats");
        if (!seatsAvailable(await seatsUsed(orgId, appId), limit)) {
            return reply.code(403).send({ error: "SEAT_LIMIT", message: `Your plan includes ${limit} seats and they are all used or reserved. Upgrade to invite more people.` });
        }
        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (existing && (await prisma.appAccess.findUnique({ where: { org_id_user_id_app_id: { org_id: orgId, user_id: existing.id, app_id: appId } } }))) {
            return reply.code(409).send({ message: "That person already has access to this workspace" });
        }

        await prisma.invite.updateMany({ where: { org_id: orgId, app_id: appId, email, status: "pending" }, data: { status: "revoked" } });
        const token = newToken();
        const invite = await prisma.invite.create({
            data: { org_id: orgId, app_id: appId, email, org_role: "member", app_role: role, token_hash: hashToken(token), invited_by: req.user.id, expires_at: inviteExpiry() },
        });
        const link = `${process.env.APP_URL}/supportops/join?token=${token}`;
        const emailed = await sendInviteEmail(email, req.access.org.name, role, link);
        return reply.code(201).send({ id: invite.id, email, role, expiresAt: invite.expires_at, link, emailed });
    });

    app.get("/", { preHandler: admin }, async (req) => {
        const rows = await prisma.invite.findMany({
            where: { org_id: req.access.org.id, app_id: req.access.app.id, status: "pending", expires_at: { gt: new Date() } },
            orderBy: { created_at: "desc" },
        });
        return rows.map((i) => ({ id: i.id, email: i.email, role: i.app_role, expiresAt: i.expires_at }));
    });

    app.delete("/:id", { preHandler: admin }, async (req) => {
        await prisma.invite.updateMany({ where: { id: req.params.id, org_id: req.access.org.id, status: "pending" }, data: { status: "revoked" } });
        return { ok: true };
    });

    /* ---------- admin: members ---------- */
    app.get("/members", { preHandler: admin }, async (req) => {
        const rows = await prisma.appAccess.findMany({
            where: { org_id: req.access.org.id, app_id: req.access.app.id },
            include: { user: { select: { id: true, name: true, email: true } } },
        });
        return rows.map((r) => ({ userId: r.user_id, name: r.user.name, email: r.user.email, role: r.app_role, owner: r.user_id === req.access.org.owner_id }));
    });

    app.delete("/members/:userId", { preHandler: admin }, async (req, reply) => {
        const { userId } = req.params;
        if (userId === req.user.id || userId === req.access.org.owner_id) {
            return reply.code(409).send({ message: "You can't remove the workspace owner or yourself" });
        }
        const orgId = req.access.org.id;
        await prisma.$transaction([
            prisma.appAccess.deleteMany({ where: { org_id: orgId, user_id: userId } }),
            prisma.membership.deleteMany({ where: { org_id: orgId, user_id: userId, org_role: { not: "owner" } } }),
        ]);
        return { ok: true };
    });

    /* ---------- invitee: preview (public) and accept (signed in) ---------- */
    app.get("/preview/:token", async (req, reply) => {
        const invite = await prisma.invite.findUnique({ where: { token_hash: hashToken(req.params.token) }, include: { org: { select: { name: true } } } });
        const problem = inviteProblem(invite);
        if (problem) return reply.code(problem.status).send({ error: problem.code, message: problem.message });
        return { email: invite.email, role: invite.app_role, orgName: invite.org.name };
    });

    app.post("/accept", { preHandler: requireAuth }, async (req, reply) => {
        const invite = await prisma.invite.findUnique({ where: { token_hash: hashToken(req.body?.token ?? "") }, include: { app: true } });
        const me = await prisma.user.findFirst({ where: { id: req.user.id, deleted_at: null }, select: { email: true } });
        const problem = inviteProblem(invite, me?.email);
        if (problem) return reply.code(problem.status).send({ error: problem.code, message: problem.message });

        const sub = await prisma.subscription.findUnique({ where: { org_id_app_id: { org_id: invite.org_id, app_id: invite.app_id } }, include: { plan: true } });
        const taken = await prisma.appAccess.count({ where: { org_id: invite.org_id, app_id: invite.app_id } });
        if (!sub || !seatsAvailable(taken, effectiveLimit(sub.plan, sub, "seats"))) {
            return reply.code(403).send({ error: "SEAT_LIMIT", message: "This workspace has no free seats. Ask your admin to upgrade the plan." });
        }

        await prisma.$transaction([
            prisma.membership.upsert({ where: { org_id_user_id: { org_id: invite.org_id, user_id: req.user.id } }, update: {}, create: { org_id: invite.org_id, user_id: req.user.id, org_role: "member" } }),
            prisma.appAccess.upsert({
                where: { org_id_user_id_app_id: { org_id: invite.org_id, user_id: req.user.id, app_id: invite.app_id } },
                update: { app_role: invite.app_role }, create: { org_id: invite.org_id, user_id: req.user.id, app_id: invite.app_id, app_role: invite.app_role },
            }),
            prisma.invite.update({ where: { id: invite.id }, data: { status: "accepted" } }),
        ]);
        return { orgId: invite.org_id, role: invite.app_role };
    });
}