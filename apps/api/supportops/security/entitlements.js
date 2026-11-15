import { prisma } from "../lib/deps.js";
import { requireAuth } from "../../src/security/authMiddleware.js";

const ACTIVE_SUBSCRIPTION_STATES = new Set(["active", "trialing"]);
const ROLE_ALIASES = {
  owner: "admin",
  admin: "admin",
  management: "management",
  manager: "management",
  agent: "agent",
  member: "agent",
};

export class AccessError extends Error {
  constructor(message = "SupportOps access is not available", statusCode = 403) {
    super(message);
    this.name = "AccessError";
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = statusCode === 402 ? "SUBSCRIPTION_REQUIRED" : "ACCESS_DENIED";
  }
}

function asLimit(value) {
  const limits = value && typeof value === "object" ? value : {};
  return (key) => {
    const candidate = limits[key] ?? limits[key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)];
    return Number.isFinite(Number(candidate)) ? Number(candidate) : null;
  };
}

/**
 * Canonical tenant/app authorization for every SupportOps API.
 * Authentication is delegated to Nexus; workspace membership, app access,
 * and subscription are reloaded from PostgreSQL for each request.
 */
export function guard({ app: appSlug = "supportops", roles = [] } = {}) {
  return async function supportOpsGuard(req, reply) {
    await requireAuth(req, reply);
    if (reply.sent || !req.user?.id) return;

    const requestedOrgId = req.headers["x-org-id"];
    const orgId = requestedOrgId ? String(requestedOrgId) : req.user.org_id;
    if (!orgId) {
      return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_REQUIRED" });
    }

    const [membership, appRecord] = await Promise.all([
      prisma.membership.findUnique({
        where: { org_id_user_id: { org_id: orgId, user_id: req.user.id } },
        include: { org: { select: { id: true, name: true, owner_id: true, deleted_at: true } } },
      }),
      prisma.app.findUnique({ where: { slug: appSlug } }),
    ]);

    if (!membership || membership.org?.deleted_at || !appRecord?.active) {
      return reply.code(403).send({ error: "SUPPORTOPS_WORKSPACE_ACCESS_DENIED" });
    }

    const [appAccess, subscription] = await Promise.all([
      prisma.appAccess.findUnique({
        where: { org_id_user_id_app_id: { org_id: orgId, user_id: req.user.id, app_id: appRecord.id } },
      }),
      prisma.subscription.findUnique({
        where: { org_id_app_id: { org_id: orgId, app_id: appRecord.id } },
        include: { plan: true },
      }),
    ]);

    if (!appAccess) {
      return reply.code(403).send({ error: "SUPPORTOPS_APP_ACCESS_REQUIRED" });
    }
    if (!subscription || !ACTIVE_SUBSCRIPTION_STATES.has(subscription.status)) {
      return reply.code(402).send({ error: "SUPPORTOPS_SUBSCRIPTION_INACTIVE" });
    }
    if (subscription.status === "trialing" && subscription.trial_ends_at && subscription.trial_ends_at <= new Date()) {
      return reply.code(402).send({ error: "SUPPORTOPS_TRIAL_EXPIRED" });
    }

    const role = ROLE_ALIASES[String(appAccess.app_role || membership.org_role || "member").toLowerCase()] || "agent";
    if (roles.length && !roles.includes(role)) {
      return reply.code(403).send({ error: "SUPPORTOPS_ROLE_FORBIDDEN" });
    }

    const mergedLimits = {
      ...(subscription.plan?.limits && typeof subscription.plan.limits === "object" ? subscription.plan.limits : {}),
      ...(subscription.limit_overrides && typeof subscription.limit_overrides === "object" ? subscription.limit_overrides : {}),
    };

    req.access = {
      org: { id: membership.org.id, name: membership.org.name, owner_id: membership.org.owner_id },
      app: { id: appRecord.id, slug: appRecord.slug },
      appAccess,
      membership,
      subscription,
      plan: subscription.plan,
      // These aliases are consumed by existing SupportOps route/controller code.
      // Always derive them from persisted entitlement records, never request headers.
      appRole: role,
      role,
      user: { id: req.user.id, email: req.user.email },
      features: Array.isArray(subscription.plan?.features) ? subscription.plan.features : [],
      limit: asLimit(mergedLimits),
    };
    req.supportOpsRole = role;
  };
}

export async function invalidateSubscription(orgId, appIdOrSlug = "supportops") {
  const appRecord = await prisma.app.findFirst({
    where: { OR: [{ id: appIdOrSlug }, { slug: appIdOrSlug }] },
    select: { id: true },
  });
  if (!appRecord) return false;
  await prisma.subscription.updateMany({
    where: { org_id: orgId, app_id: appRecord.id },
    data: { status: "canceled" },
  });
  return true;
}
