import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { createAccessToken } from "../services/authTokens.js";
import { chooseActiveMembership, subscriptionUsable } from "../security/workspaceAccessRules.js";

async function buildSupportOpsWorkspace(userId, requestedOrgId) {
  const [user, memberships, app] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, deleted_at: null }, select: { id: true, email: true, name: true, role: true, subscription: true, org_id: true } }),
    prisma.membership.findMany({ where: { user_id: userId, org: { deleted_at: null } }, include: { org: true } }),
    prisma.app.findFirst({ where: { slug: "supportops", active: true } }),
  ]);
  if (!user) return null;
  const active = chooseActiveMembership(memberships, user.org_id, requestedOrgId);
  if (!active) return { user, workspace: null, appState: { status: "no_workspace", subscribed: false } };
  if (!app) return { user, workspace: { id: active.org_id, name: active.org.name, role: active.org_role }, appState: { status: "unavailable", subscribed: false } };

  const [subscription, grant] = await Promise.all([
    prisma.subscription.findUnique({ where: { org_id_app_id: { org_id: active.org_id, app_id: app.id } }, include: { plan: true } }),
    prisma.appAccess.findUnique({ where: { org_id_user_id_app_id: { org_id: active.org_id, user_id: userId, app_id: app.id } } }),
  ]);
  const usable = Boolean(grant && subscriptionUsable(subscription));
  return {
    user,
    workspace: { id: active.org_id, name: active.org.name, role: active.org_role },
    appState: {
      status: usable ? subscription.status : (subscription?.status || "not_subscribed"),
      subscribed: usable,
      plan: usable ? subscription.plan.key : null,
      role: grant?.app_role || null,
      trialEndsAt: subscription?.trial_ends_at || null,
    },
  };
}

export default async function supportopsRoutes(app) {
  app.post("/login", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = request.body?.password;
    if (!email || typeof password !== "string" || !password) {
      return reply.code(400).send({ success: false, error: "MISSING_CREDENTIALS", message: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deleted_at) {
      return reply.code(401).send({ success: false, error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
    }
    if (user.locked_until && user.locked_until > new Date()) {
      return reply.code(423).send({ success: false, error: "ACCOUNT_TEMPORARILY_LOCKED", message: "Too many unsuccessful attempts. Try again later." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash || "");
    if (!passwordMatches) {
      const nextAttempts = (user.failed_attempts || 0) + 1;
      await prisma.user.update({ where: { id: user.id }, data: {
        failed_attempts: nextAttempts,
        ...(nextAttempts >= 5 ? { locked_until: new Date(Date.now() + 15 * 60 * 1000) } : {}),
      } });
      return reply.code(401).send({ success: false, error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
    }

    await prisma.user.update({ where: { id: user.id }, data: { failed_attempts: 0, locked_until: null } });
    const session = await buildSupportOpsWorkspace(user.id, request.body?.orgId);
    if (!session) return reply.code(401).send({ success: false, error: "ACCOUNT_UNAVAILABLE" });
    const token = createAccessToken(user, session.workspace?.name || null);
    const apps = { supportops: session.appState };
    const profile = { ...session.user, activeOrgId: session.workspace?.id || null, orgs: session.workspace ? [session.workspace] : [], apps };

    return reply.send({
      success: true, token, user: profile, workspace: session.workspace, apps,
      redirectUrl: "/supportops/admin/executive",
    });
  });

  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    const session = await buildSupportOpsWorkspace(request.user.id, request.headers["x-org-id"]);
    if (!session) return reply.code(401).send({ success: false, error: "ACCOUNT_UNAVAILABLE" });
    const apps = { supportops: session.appState };
    const profile = { ...session.user, activeOrgId: session.workspace?.id || null, orgs: session.workspace ? [session.workspace] : [], apps };
    return { success: true, user: profile, workspace: session.workspace, apps };
  });

  app.post("/logout", async () => ({ success: true }));

  app.get("/", { preHandler: requireAuth }, async () => ({ status: "SupportOps module operational", version: "2.0.0" }));
}
