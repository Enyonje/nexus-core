// apps/api/supportops/security/entitlements.js  The one guard for every app: plan + add-ons + role + usage.
// Replaces entitlements-compat.js. Needs entitlementRules.js in the same folder.
import { prisma, requireAuth } from "../lib/deps.js";


const GRACE_MS = 3 * 24 * 60 * 60 * 1000;
const TTL_MS = 30_000;

export class AccessError extends Error {
  constructor(status, code, message, extra = {}) { super(message); this.status = status; this.code = code; this.extra = extra; }
}

const appCache = new Map();
const subCache = new Map();
const cached = async (map, key, load) => {
  const hit = map.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  const value = await load();
  map.set(key, { value, exp: Date.now() + TTL_MS });
  return value;
};
export const invalidateSubscription = (orgId, appId) => subCache.delete(`${orgId}:${appId}`);

const getApp = (slug) => cached(appCache, slug, () => prisma.app.findFirst({ where: { slug, active: true } }));
const getSub = (orgId, appId) =>
  cached(subCache, `${orgId}:${appId}`, () =>
    prisma.subscription.findUnique({
      where: { org_id_app_id: { org_id: orgId, app_id: appId } },
      include: { plan: true, addons: { include: { addon: true } } },
    }));

export function subscriptionUsable(sub) {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "trialing") return !sub.trial_ends_at || sub.trial_ends_at > new Date();
  if (sub.status === "past_due" && sub.current_period_end) return Date.now() < sub.current_period_end.getTime() + GRACE_MS;
  return false;
}

async function resolveOrg(userId, requestedOrgId) {
  const memberships = await prisma.membership.findMany({ where: { user_id: userId, org: { deleted_at: null } }, include: { org: true } });
  let active;
  if (requestedOrgId) {
    active = memberships.find((m) => m.org_id === requestedOrgId);
    if (!active) throw new AccessError(403, "NOT_A_MEMBER", "You are not a member of this organization");
  } else {
    active = memberships.find((m) => m.org.type === "PERSONAL") ?? memberships[0];
  }
  return { memberships, active: active ?? null };
}

export async function getAccess(userId, requestedOrgId, appSlug) {
  const { active } = await resolveOrg(userId, requestedOrgId);
  if (!active) throw new AccessError(403, "NO_ORGANIZATION", "No workspace found for this account");
  const app = await getApp(appSlug);
  if (!app) throw new AccessError(404, "UNKNOWN_APP", `Unknown app "${appSlug}"`);

  const sub = await getSub(active.org_id, app.id);
  if (!subscriptionUsable(sub)) {
    const ended = sub?.status === "trialing";
    throw new AccessError(403, ended ? "TRIAL_ENDED" : "NO_SUBSCRIPTION", ended ? "Your trial has ended. Choose a plan to continue." : `No active ${app.name} subscription`, { app: app.slug });
  }
  const grant = await prisma.appAccess.findUnique({ where: { org_id_user_id_app_id: { org_id: active.org_id, user_id: userId, app_id: app.id } } });
  if (!grant) throw new AccessError(403, "NO_APP_ACCESS", `You have not been given access to ${app.name} in this workspace`, { app: app.slug });

  return {
    userId, org: active.org, orgRole: active.org_role, app, subscription: sub, plan: sub.plan, appRole: grant.app_role,
    features: effectiveFeatures(sub.plan, sub.addons.map((a) => a.addon)),
    limit: (metric) => effectiveLimit(sub.plan, sub, metric),
  };
}

// guard({ app, feature?, roles?, orgRoles? })  ->  Fastify preHandler
export function guard({ app, feature, roles, orgRoles } = {}) {
  return async (req, reply) => {
    await requireAuth(req, reply);
    if (reply.sent) return;
    try {
      const ctx = await getAccess(req.user.id, req.headers["x-org-id"], app ?? "supportops");
      if (orgRoles && !orgRoles.includes(ctx.orgRole)) throw new AccessError(403, "ORG_ROLE_FORBIDDEN", "Your organization role does not allow this");
      if (roles && !roles.includes(ctx.appRole)) throw new AccessError(403, "ROLE_FORBIDDEN", "Your role does not allow this", { role: ctx.appRole });
      if (feature && !ctx.features.includes(feature)) throw upgradeError(ctx, feature);
      req.access = ctx;
    } catch (err) {
      if (err instanceof AccessError) return reply.code(err.status).send({ error: err.code, message: err.message, ...err.extra });
      throw err;
    }
  };
}

// Tells the frontend exactly what to sell: a higher plan, or a single add-on
export function upgradeError(ctx, feature) {
  return new AccessError(403, "PLAN_UPGRADE_REQUIRED", "Your plan does not include this feature", {
    app: ctx.app.slug, feature, currentPlan: ctx.plan.key,
  });
}

/* ---------- AI resolution metering ---------- */
const period = () => new Date().toISOString().slice(0, 7);

async function reportOverage(orgId) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_METER_EVENT_NAME) return;
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { stripe_customer_id: true } });
    if (!org?.stripe_customer_id) return;
    const { default: Stripe } = await import("stripe");
    await new Stripe(process.env.STRIPE_SECRET_KEY).billing.meterEvents.create({
      event_name: process.env.STRIPE_METER_EVENT_NAME,
      payload: { stripe_customer_id: org.stripe_customer_id, value: "1" },
    });
  } catch (err) {
    console.error("Overage report failed (usage is still recorded):", err.message);
  }
}

/**
 * Call once each time AI successfully resolves a ticket or an agent accepts an AI draft.
 *   const u = await recordAiResolution(orgId);   // -> { count, included, overage }
 * Trials stop at their cap (429 TRIAL_LIMIT_REACHED); paid plans keep going and bill the overage.
 */
export async function recordAiResolution(orgId, appSlug = "supportops") {
  const app = await getApp(appSlug);
  const sub = app && (await getSub(orgId, app.id));
  if (!subscriptionUsable(sub)) throw new AccessError(403, "NO_SUBSCRIPTION", "No active subscription");

  const included = effectiveLimit(sub.plan, sub, "ai_resolutions");
  const row = await prisma.usageRecord.upsert({
    where: { org_id_app_id_metric_period: { org_id: orgId, app_id: app.id, metric: "ai_resolutions", period: period() } },
    update: { count: { increment: 1 } },
    create: { org_id: orgId, app_id: app.id, metric: "ai_resolutions", period: period(), count: 1 },
  });
  const d = usageDecision({ count: row.count, limit: included, hardCap: isTrial(sub) });
  if (!d.allowed) {
    await prisma.usageRecord.update({ where: { id: row.id }, data: { count: { decrement: 1 } } });
    throw new AccessError(429, "TRIAL_LIMIT_REACHED", `Trial limit of ${included} AI resolutions reached. Choose a plan to continue.`, { limit: included });
  }
  if (d.overage > 0) reportOverage(orgId); // fire and forget
  return { count: row.count, included, overage: d.overage };
}

/* ---------- workspace bootstrap (idempotent) ---------- */
export async function ensurePersonalWorkspace(userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, deleted_at: null }, select: { id: true, email: true, name: true, role: true } });
  if (!user) return null;
  let org = await prisma.organization.findFirst({ where: { owner_id: userId, type: "PERSONAL" } });
  if (!org) org = await prisma.organization.create({ data: { name: `${user.name || user.email}'s workspace`, type: "PERSONAL", owner_id: userId } });

  await prisma.membership.upsert({
    where: { org_id_user_id: { org_id: org.id, user_id: userId } }, update: {},
    create: { org_id: org.id, user_id: userId, org_role: "owner" },
  });
  const core = await prisma.app.findUnique({ where: { slug: "nexus-core" }, include: { plans: true } });
  const free = core?.plans.find((p) => p.key === "free");
  if (free) {
    await prisma.subscription.upsert({
      where: { org_id_app_id: { org_id: org.id, app_id: core.id } }, update: {},
      create: { org_id: org.id, app_id: core.id, plan_id: free.id, status: "active" },
    });
    await prisma.appAccess.upsert({
      where: { org_id_user_id_app_id: { org_id: org.id, user_id: userId, app_id: core.id } }, update: {},
      create: { org_id: org.id, user_id: userId, app_id: core.id, app_role: user.role === "admin" ? "admin" : core.default_role },
    });
  }
  return org;
}

/* ---------- the /me payload ---------- */
export async function buildSession(userId, requestedOrgId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deleted_at: null },
    select: { id: true, email: true, name: true, role: true, subscription: true, is_platform_admin: true },
  });
  if (!user) return null;
  await ensurePersonalWorkspace(userId);

  const { memberships, active } = await resolveOrg(userId, requestedOrgId);
  const apps = {};
  if (active) {
    const [subs, grants, usage] = await Promise.all([
      prisma.subscription.findMany({ where: { org_id: active.org_id }, include: { app: true, plan: true, addons: { include: { addon: true } } } }),
      prisma.appAccess.findMany({ where: { org_id: active.org_id, user_id: userId } }),
      prisma.usageRecord.findMany({ where: { org_id: active.org_id, period: period() } }),
    ]);
    const roleByApp = new Map(grants.map((g) => [g.app_id, g.app_role]));
    for (const s of subs) {
      if (!s.app.active || !subscriptionUsable(s) || !roleByApp.has(s.app_id)) continue;
      apps[s.app.slug] = {
        plan: s.plan.key, status: s.status, role: roleByApp.get(s.app_id),
        features: effectiveFeatures(s.plan, s.addons.map((a) => a.addon)),
        limits: { ...s.plan.limits, ...(s.limit_overrides ?? {}) },
        usage: Object.fromEntries(usage.filter((u) => u.app_id === s.app_id).map((u) => [u.metric, u.count])),
        trialEndsAt: s.trial_ends_at, currentPeriodEnd: s.current_period_end,
      };
    }
  }
  return {
    user, activeOrgId: active?.org_id ?? null, apps,
    orgs: memberships.map((m) => ({ id: m.org_id, name: m.org.name, type: m.org.type, role: m.org_role })),
  };
}