import crypto from "crypto";

/**
 * In-memory implementation of the auth/billing store contract.
 * Used by the automated tests and by `npm run dev:sandbox` (no database needed).
 * Data disappears when the process stops. Never use in production.
 */
export function createMemoryStore() {
  const users = new Map();
  const orgs = new Map();
  const memberships = [];
  const access = [];
  const sessions = new Map();
  const subscriptions = new Map();
  const stripeEvents = new Set();
  const audits = [];
  const id = () => crypto.randomUUID();
  const clone = (v) => (v ? structuredClone(v) : null);

  return {
    kind: "memory",
    _debug: { users, orgs, sessions, subscriptions, audits, access },

    async findUserByEmail(email) {
      for (const u of users.values()) if (u.email === email && !u.deleted_at) return clone(u);
      return null;
    },
    async findUserById(userId) {
      const u = users.get(userId);
      return u && !u.deleted_at ? clone(u) : null;
    },
    async createAccount({ email, passwordHash, orgName, name, product, appRole }) {
      for (const u of users.values()) {
        if (u.email === email) {
          const err = new Error("exists");
          err.code = "EMAIL_EXISTS";
          throw err;
        }
      }
      const org = { id: id(), name: orgName, stripe_customer_id: null, type: "TEAM" };
      const user = {
        id: id(), email, name: name || null, password_hash: passwordHash, role: "user",
        is_platform_admin: false, org_id: org.id, failed_attempts: 0, locked_until: null,
        reset_token: null, reset_token_expires: null, created_at: new Date(), deleted_at: null,
        refresh_token: null, mfa_enabled: false, mfa_secret: null,
      };
      org.owner_id = user.id;
      orgs.set(org.id, org);
      users.set(user.id, user);
      memberships.push({ org_id: org.id, user_id: user.id, org_role: "owner" });
      access.push({ org_id: org.id, user_id: user.id, product, app_role: appRole });
      return { user: clone(user), org: clone(org) };
    },
    async getProductAccess(userId, product) {
      return clone(access.find((a) => a.user_id === userId && a.product === product)) || null;
    },
    async grantProductAccess({ userId, orgId, product, appRole }) {
      if (!access.some((a) => a.user_id === userId && a.product === product)) {
        access.push({ org_id: orgId, user_id: userId, product, app_role: appRole });
      }
    },
    async listProductAccess(userId) {
      return access.filter((a) => a.user_id === userId).map(clone);
    },
    async getMembershipRole(userId, orgId) {
      return memberships.find((m) => m.user_id === userId && m.org_id === orgId)?.org_role || null;
    },
    async updateLoginState(userId, { failedAttempts, lockedUntil }) {
      const u = users.get(userId);
      if (u) Object.assign(u, { failed_attempts: failedAttempts, locked_until: lockedUntil });
    },
    async createSession({ userId, product, tokenHash, familyId, expiresAt }) {
      const s = { id: id(), userId, product, tokenHash, familyId, expiresAt, revokedAt: null };
      sessions.set(tokenHash, s);
      return clone(s);
    },
    async findSessionByHash(tokenHash) {
      return clone(sessions.get(tokenHash)) || null;
    },
    async revokeSession(sessionId) {
      for (const s of sessions.values()) if (s.id === sessionId && !s.revokedAt) s.revokedAt = new Date();
    },
    async revokeFamily(familyId) {
      for (const s of sessions.values()) if (s.familyId === familyId && !s.revokedAt) s.revokedAt = new Date();
    },
    async hasActiveSessionInFamily(familyId) {
      const now = new Date();
      for (const s of sessions.values()) if (s.familyId === familyId && !s.revokedAt && new Date(s.expiresAt) > now) return true;
      return false;
    },
    async revokeUserSessions(userId, product) {
      for (const s of sessions.values()) {
        if (s.userId === userId && s.product === product && !s.revokedAt) s.revokedAt = new Date();
      }
    },
    async findUserByLegacyRefreshHash() {
      return null;
    },
    async setResetToken(userId, value, expires) {
      const u = users.get(userId);
      if (u) Object.assign(u, { reset_token: value, reset_token_expires: expires });
    },
    async findUserByResetToken(value) {
      for (const u of users.values()) if (u.reset_token === value) return clone(u);
      return null;
    },
    async updatePassword(userId, passwordHash) {
      const u = users.get(userId);
      if (u) Object.assign(u, { password_hash: passwordHash, reset_token: null, reset_token_expires: null, failed_attempts: 0, locked_until: null });
    },
    async getOrg(orgId) {
      return clone(orgs.get(orgId)) || null;
    },
    async setOrgStripeCustomer(orgId, customerId) {
      const o = orgs.get(orgId);
      if (o) o.stripe_customer_id = customerId;
    },
    async findOrgByStripeCustomer(customerId) {
      for (const o of orgs.values()) if (o.stripe_customer_id === customerId) return clone(o);
      return null;
    },
    async getSubscription(orgId, product) {
      return clone(subscriptions.get(`${orgId}:${product}`)) || null;
    },
    async findSubscriptionByStripeId(stripeSubscriptionId) {
      for (const s of subscriptions.values()) if (s.stripe_subscription_id === stripeSubscriptionId) return clone(s);
      return null;
    },
    async upsertSubscription(data) {
      const key = `${data.orgId}:${data.product}`;
      const prev = subscriptions.get(key) || {};
      const next = {
        ...prev,
        org_id: data.orgId,
        product: data.product,
        plan_key: data.planKey ?? prev.plan_key,
        status: data.status ?? prev.status,
        current_period_end: data.currentPeriodEnd ?? prev.current_period_end ?? null,
        cancel_at_period_end: data.cancelAtPeriodEnd ?? prev.cancel_at_period_end ?? false,
        trial_ends_at: data.trialEndsAt ?? prev.trial_ends_at ?? null,
        stripe_subscription_id: data.stripeSubscriptionId ?? prev.stripe_subscription_id ?? null,
        interval: data.interval ?? prev.interval ?? null,
      };
      subscriptions.set(key, next);
      return clone(next);
    },
    async markStripeEvent(eventId) {
      if (stripeEvents.has(eventId)) return false;
      stripeEvents.add(eventId);
      return true;
    },
    async audit(userId, action, meta = {}) {
      audits.push({ userId, action, meta, at: new Date() });
    },
  };
}
