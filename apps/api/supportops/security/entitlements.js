import { prisma } from "../config/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { effectiveFeatures, effectiveLimit, isTrial, usageDecision } from "./entitlementRules.js";
import { chooseActiveMembership, subscriptionUsable } from "./workspaceAccessRules.js";

const CACHE_TTL_MS = 30_000;
const appCache = new Map();
const subscriptionCache = new Map();

export class AccessError extends Error {
  constructor(status, code, message, extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra; }
}

async function cached(map, key, load) {
  const hit = map.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const value = await load();
  map.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export const invalidateSubscription = (orgId, appId) => subscriptionCache.delete(`${orgId}:${appId}`);
const getApp = (slug) => cached(appCache, slug, () => prisma.app.findFirst({ where: { slug, active: true } }));
const getSubscription = (orgId, appId) => cached(subscriptionCache, `${orgId}:${appId}`, () => prisma.subscription.findUnique({
  where: { org_id_app_id: { org_id: orgId, app_id: appId } },
  include: { plan: true, addons: { include: { addon: true } } },
}));

async function resolveOrganization(userId, requestedOrgId) {
  const [memberships, user] = await Promise.all([
    prisma.membership.findMany({ where: { user_id: userId, org: { deleted_at: null } }, include: { org: true } }),
    prisma.user.findFirst({ where: { id: userId, deleted_at: null }, select: { org_id: true } }),
  ]);
  const active = chooseActiveMembership(memberships, user?.org_id, requestedOrgId);
  if (requestedOrgId && !active) throw new AccessError(403, "NOT_A_MEMBER", "You are not a member of this organization");
  return { memberships, active: active ?? null };
}

export async function getAccess(userId, requestedOrgId, appSlug = "supportops") {
  const { active } = await resolveOrganization(userId, requestedOrgId);
  if (!active) throw new AccessError(403, "NO_ORGANIZATION", "No workspace found for this account");
  const app = await getApp(appSlug);
  if (!app) throw new AccessError(404, "UNKNOWN_APP", `Unknown app "${appSlug}"`);
  const subscription = await getSubscription(active.org_id, app.id);
  if (!subscriptionUsable(subscription)) {
    const trialEnded = subscription?.status === "trialing";
    throw new AccessError(403, trialEnded ? "TRIAL_ENDED" : "NO_SUBSCRIPTION", trialEnded ? "Your trial has ended. Choose a plan to continue." : `No active ${app.name} subscription`, { app: app.slug });
  }
  const grant = await prisma.appAccess.findUnique({ where: { org_id_user_id_app_id: { org_id: active.org_id, user_id: userId, app_id: app.id } } });
  if (!grant) throw new AccessError(403, "NO_APP_ACCESS", `You have not been given access to ${app.name} in this workspace`, { app: app.slug });
  return {
    userId, org: active.org, orgRole: active.org_role, app, subscription, plan: subscription.plan, appRole: grant.app_role,
    features: effectiveFeatures(subscription.plan, subscription.addons.map((item) => item.addon)),
    limit: (metric) => effectiveLimit(subscription.plan, subscription, metric),
  };
}

export function guard({ app = "supportops", feature, roles, orgRoles } = {}) {
  return async (request, reply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;
    try {
      const context = await getAccess(request.user.id, request.headers["x-org-id"], app);
      if (orgRoles && !orgRoles.includes(context.orgRole)) throw new AccessError(403, "ORG_ROLE_FORBIDDEN", "Your organization role does not allow this");
      if (roles && !roles.includes(context.appRole)) throw new AccessError(403, "ROLE_FORBIDDEN", "Your role does not allow this", { role: context.appRole });
      if (feature && !context.features.includes(feature)) throw new AccessError(403, "PLAN_UPGRADE_REQUIRED", "Your plan does not include this feature", { app: context.app.slug, feature, currentPlan: context.plan.key });
      request.access = context;
    } catch (error) {
      if (error instanceof AccessError) return reply.code(error.status).send({ error: error.code, message: error.message, ...error.extra });
      throw error;
    }
  };
}

export async function recordAiResolution(orgId, appSlug = "supportops") {
  const app = await getApp(appSlug);
  const subscription = app && await getSubscription(orgId, app.id);
  if (!subscriptionUsable(subscription)) throw new AccessError(403, "NO_SUBSCRIPTION", "No active subscription");
  const period = new Date().toISOString().slice(0, 7);
  const included = effectiveLimit(subscription.plan, subscription, "ai_resolutions");
  const row = await prisma.usageRecord.upsert({
    where: { org_id_app_id_metric_period: { org_id: orgId, app_id: app.id, metric: "ai_resolutions", period } },
    update: { count: { increment: 1 } },
    create: { org_id: orgId, app_id: app.id, metric: "ai_resolutions", period, count: 1 },
  });
  const decision = usageDecision({ count: row.count, limit: included, hardCap: isTrial(subscription) });
  if (!decision.allowed) {
    await prisma.usageRecord.update({ where: { id: row.id }, data: { count: { decrement: 1 } } });
    throw new AccessError(429, "TRIAL_LIMIT_REACHED", `Trial limit of ${included} AI resolutions reached. Choose a plan to continue.`, { limit: included });
  }
  return { count: row.count, included, overage: decision.overage };
}

export { chooseActiveMembership, subscriptionUsable };
