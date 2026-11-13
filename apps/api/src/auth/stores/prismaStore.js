import crypto from "crypto";
import { PRODUCTS } from "../products.js";
import { planByKey } from "../../billing/catalog.js";

const SUB_STATUSES = new Set(["trialing", "active", "past_due", "canceled", "incomplete"]);
const toDbStatus = (s) => (SUB_STATUSES.has(s) ? s : s === "unpaid" ? "past_due" : s === "incomplete_expired" ? "canceled" : "incomplete");

const USER_SELECT = {
  id: true, email: true, name: true, password_hash: true, role: true, is_platform_admin: true,
  org_id: true, failed_attempts: true, locked_until: true, created_at: true, deleted_at: true,
  mfa_enabled: true, mfa_secret: true, reset_token_expires: true,
};

/**
 * Production store backed by Prisma/PostgreSQL. Prisma is imported lazily so that tests and the
 * sandbox server never need a database connection.
 */
export function createPrismaStore(prismaClient) {
  let prismaPromise = prismaClient ? Promise.resolve(prismaClient) : null;
  const db = () => (prismaPromise ??= import("../../config/prisma.js").then((m) => m.prisma));
  const appIds = new Map();

  async function appId(slug) {
    if (appIds.has(slug)) return appIds.get(slug);
    const prisma = await db();
    const product = PRODUCTS[slug];
    const app = await prisma.app.upsert({
      where: { slug },
      update: {},
      create: { slug, name: product.name, roles: product.roles, default_role: product.defaultRole },
      select: { id: true },
    });
    appIds.set(slug, app.id);
    return app.id;
  }

  async function planId(slug, key) {
    const prisma = await db();
    const app_id = await appId(slug);
    const plan = planByKey(slug, key);
    const row = await prisma.plan.upsert({
      where: { app_id_key: { app_id, key } },
      update: {},
      create: {
        app_id, key, name: plan?.name || key, features: plan?.features || [],
        price_cents: plan?.prices?.monthly?.amount != null ? plan.prices.monthly.amount * 100 : null,
      },
      select: { id: true },
    });
    return row.id;
  }

  const mapSub = (row, product) =>
    row && {
      org_id: row.org_id,
      product,
      plan_key: row.plan?.key || null,
      status: row.status,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
      trial_ends_at: row.trial_ends_at,
      stripe_subscription_id: row.stripe_subscription_id,
    };

  return {
    kind: "prisma",
    async findUserByEmail(email) {
      const prisma = await db();
      return prisma.user.findFirst({ where: { email, deleted_at: null }, select: USER_SELECT });
    },
    async findUserById(id) {
      const prisma = await db();
      return prisma.user.findFirst({ where: { id, deleted_at: null }, select: USER_SELECT });
    },
    async createAccount({ email, passwordHash, orgName, name, product, appRole }) {
      const prisma = await db();
      const app_id = await appId(product);
      try {
        return await prisma.$transaction(async (tx) => {
          const userId = crypto.randomUUID();
          const org = await tx.organization.create({ data: { name: orgName, type: "TEAM", owner_id: userId } });
          const user = await tx.user.create({
            data: { id: userId, email, name: name || null, password_hash: passwordHash, role: "user", org_id: org.id },
            select: USER_SELECT,
          });
          await tx.membership.create({ data: { org_id: org.id, user_id: user.id, org_role: "owner" } });
          await tx.appAccess.create({ data: { org_id: org.id, user_id: user.id, app_id, app_role: appRole } });
          return { user, org };
        });
      } catch (err) {
        if (err?.code === "P2002") {
          const e = new Error("exists");
          e.code = "EMAIL_EXISTS";
          throw e;
        }
        throw err;
      }
    },
    async getProductAccess(userId, product) {
      const prisma = await db();
      const row = await prisma.appAccess.findFirst({
        where: { user_id: userId, app: { slug: product, active: true }, org: { deleted_at: null } },
        orderBy: { created_at: "asc" },
      });
      return row ? { org_id: row.org_id, user_id: row.user_id, product, app_role: row.app_role } : null;
    },
    async grantProductAccess({ userId, orgId, product, appRole }) {
      const prisma = await db();
      const app_id = await appId(product);
      await prisma.appAccess.upsert({
        where: { org_id_user_id_app_id: { org_id: orgId, user_id: userId, app_id } },
        update: {},
        create: { org_id: orgId, user_id: userId, app_id, app_role: appRole },
      });
    },
    async listProductAccess(userId) {
      const prisma = await db();
      const rows = await prisma.appAccess.findMany({ where: { user_id: userId }, include: { app: { select: { slug: true } } } });
      return rows.map((r) => ({ org_id: r.org_id, product: r.app.slug, app_role: r.app_role }));
    },
    async getMembershipRole(userId, orgId) {
      const prisma = await db();
      const m = await prisma.membership.findUnique({ where: { org_id_user_id: { org_id: orgId, user_id: userId } } });
      return m?.org_role || null;
    },
    async updateLoginState(userId, { failedAttempts, lockedUntil }) {
      const prisma = await db();
      await prisma.user.update({ where: { id: userId }, data: { failed_attempts: failedAttempts, locked_until: lockedUntil } });
    },
    async createSession({ userId, product, tokenHash, familyId, expiresAt }) {
      const prisma = await db();
      return prisma.session.create({ data: { userId, product, tokenHash, familyId, expiresAt } });
    },
    async findSessionByHash(tokenHash) {
      const prisma = await db();
      return prisma.session.findUnique({ where: { tokenHash } });
    },
    async revokeSession(id) {
      const prisma = await db();
      await prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
    },
    async revokeFamily(familyId) {
      const prisma = await db();
      await prisma.session.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    },
    async hasActiveSessionInFamily(familyId) {
      const prisma = await db();
      const count = await prisma.session.count({ where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } } });
      return count > 0;
    },
    async revokeUserSessions(userId, product) {
      const prisma = await db();
      await prisma.session.updateMany({ where: { userId, product, revokedAt: null }, data: { revokedAt: new Date() } });
    },
    // Sessions issued by the old /api/auth implementation stored a hashed refresh token on users.refresh_token.
    async findUserByLegacyRefreshHash(hash) {
      const prisma = await db();
      const user = await prisma.user.findFirst({
        where: { refresh_token: hash, deleted_at: null, OR: [{ refresh_token_expires: null }, { refresh_token_expires: { gt: new Date() } }] },
        select: USER_SELECT,
      });
      if (user) await prisma.user.update({ where: { id: user.id }, data: { refresh_token: null } });
      return user;
    },
    async setResetToken(userId, value, expires) {
      const prisma = await db();
      await prisma.user.update({ where: { id: userId }, data: { reset_token: value, reset_token_expires: expires } });
    },
    async findUserByResetToken(value) {
      const prisma = await db();
      return prisma.user.findFirst({ where: { reset_token: value, deleted_at: null }, select: USER_SELECT });
    },
    async updatePassword(userId, passwordHash) {
      const prisma = await db();
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: passwordHash, reset_token: null, reset_token_expires: null, failed_attempts: 0, locked_until: null, refresh_token: null },
      });
    },
    async getOrg(orgId) {
      const prisma = await db();
      return prisma.organization.findFirst({ where: { id: orgId, deleted_at: null }, select: { id: true, name: true, stripe_customer_id: true } });
    },
    async setOrgStripeCustomer(orgId, customerId) {
      const prisma = await db();
      await prisma.organization.update({ where: { id: orgId }, data: { stripe_customer_id: customerId } });
    },
    async findOrgByStripeCustomer(customerId) {
      const prisma = await db();
      return prisma.organization.findUnique({ where: { stripe_customer_id: customerId }, select: { id: true, name: true, stripe_customer_id: true } });
    },
    async getSubscription(orgId, product) {
      const prisma = await db();
      const row = await prisma.subscription.findFirst({ where: { org_id: orgId, app: { slug: product } }, include: { plan: true } });
      return mapSub(row, product);
    },
    async findSubscriptionByStripeId(stripeSubscriptionId) {
      const prisma = await db();
      const row = await prisma.subscription.findUnique({ where: { stripe_subscription_id: stripeSubscriptionId }, include: { plan: true, app: true } });
      return row ? mapSub(row, row.app.slug) : null;
    },
    async upsertSubscription(d) {
      const prisma = await db();
      const app_id = await appId(d.product);
      const data = {
        ...(d.planKey ? { plan_id: await planId(d.product, d.planKey) } : {}),
        ...(d.status ? { status: toDbStatus(d.status) } : {}),
        ...(d.currentPeriodEnd !== undefined ? { current_period_end: d.currentPeriodEnd } : {}),
        ...(d.cancelAtPeriodEnd !== undefined ? { cancel_at_period_end: d.cancelAtPeriodEnd } : {}),
        ...(d.trialEndsAt !== undefined ? { trial_ends_at: d.trialEndsAt } : {}),
        ...(d.stripeSubscriptionId ? { stripe_subscription_id: d.stripeSubscriptionId } : {}),
      };
      const row = await prisma.subscription.upsert({
        where: { org_id_app_id: { org_id: d.orgId, app_id } },
        update: data,
        create: { org_id: d.orgId, app_id, plan_id: data.plan_id || (await planId(d.product, "free")), ...data },
        include: { plan: true },
      });
      return mapSub(row, d.product);
    },
    async markStripeEvent(eventId, type) {
      const prisma = await db();
      try {
        await prisma.stripeEvent.create({ data: { id: eventId, type } });
        return true;
      } catch (err) {
        if (err?.code === "P2002") return false;
        throw err;
      }
    },
    async audit(userId, action, meta = {}) {
      if (!userId) return;
      try {
        const prisma = await db();
        await prisma.authAudit.create({ data: { id: crypto.randomUUID(), user_id: userId, action, details: meta, created_at: new Date() } });
      } catch (err) {
        console.error("[auth] audit write failed:", err.message);
      }
    },
  };
}
