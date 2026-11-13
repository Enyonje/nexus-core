import crypto from "crypto";
import { getProduct } from "./products.js";
import { requireProductAuth } from "./guard.js";
import {
  AuthError, assertPasswordPolicy, hashPassword, normalizeEmail, verifyPassword,
} from "./passwords.js";
import { hashToken, newRefreshToken, refreshExpiry, signAccessToken, REFRESH_TTL_DAYS } from "./tokens.js";

/** How long an already-rotated refresh token is accepted again (concurrent tabs / aborted responses). */
export const REFRESH_REUSE_GRACE_MS = 30_000;
const reuseGraceMs = (env) =>
  env.AUTH_REFRESH_GRACE_SECONDS !== undefined ? Number(env.AUTH_REFRESH_GRACE_SECONDS) * 1000 : REFRESH_REUSE_GRACE_MS;

const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MS = 60 * 60 * 1000;

const rate = (max, timeWindow = "1 minute") => ({ config: { rateLimit: { max, timeWindow } } });

function sendError(reply, err, fallback) {
  if (err instanceof AuthError) {
    return reply.code(err.status).send({ error: err.code, message: err.message, ...(err.hint ? { hint: err.hint } : {}) });
  }
  reply.log?.error?.(err);
  return reply.code(500).send({ error: fallback, message: "Something went wrong. Please try again." });
}

function publicSubscription(sub) {
  const active = Boolean(sub && ["active", "trialing"].includes(sub.status));
  return {
    tier: active ? sub.plan_key || "free" : "free",
    plan: sub?.plan_key || "free",
    status: sub?.status || "inactive",
    active,
    current_period_end: sub?.current_period_end || null,
    cancel_at_period_end: Boolean(sub?.cancel_at_period_end),
  };
}

/**
 * Registers the dedicated auth endpoints for one product on a Fastify scope.
 *   POST /register  POST /login  POST /refresh  POST /logout
 *   GET  /me        GET  /subscription
 *   POST /forgot-password  POST /reset-password
 */
export function productAuthRoutes({ product: slug, store, mailer, env = process.env }) {
  const product = getProduct(slug);
  const isProd = env.NODE_ENV === "production";
  const frontend = (env.FRONTEND_URL || "https://nexusthecore.com").replace(/\/$/, "");
  const cookieOptions = {
    httpOnly: true,
    secure: isProd || env.COOKIE_SAMESITE === "none",
    sameSite: ["strict", "lax", "none"].includes(env.COOKIE_SAMESITE) ? env.COOKIE_SAMESITE : "lax",
    path: "/",
  };

  function productRole(user, grant) {
    if (slug === "nexus-core" && (user.role === "admin" || user.is_platform_admin)) return "admin";
    return grant?.app_role || product.defaultRole;
  }

  function userView(user, grant) {
    return {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: productRole(user, grant),
      org_id: grant?.org_id || user.org_id || null,
      product: slug,
      createdAt: user.created_at,
    };
  }

  async function issueSession(reply, user, grant, familyId = crypto.randomUUID()) {
    const raw = newRefreshToken();
    await store.createSession({
      userId: user.id, product: slug, tokenHash: hashToken(raw), familyId, expiresAt: refreshExpiry(),
    });
    reply.setCookie(product.cookieName, raw, { ...cookieOptions, maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 });
    const view = userView(user, grant);
    const token = signAccessToken(slug, { sub: user.id, email: user.email, role: view.role, org_id: view.org_id, sid: familyId }, env);
    const subscription = publicSubscription(view.org_id ? await store.getSubscription(view.org_id, slug) : null);
    return { token, user: { ...view, subscription }, subscription, product: slug, redirectTo: product.homePath };
  }

  async function resolveGrant(user) {
    let grant = await store.getProductAccess(user.id, slug);
    if (!grant && product.grantOnFirstLogin) {
      const all = await store.listProductAccess(user.id);
      // Only auto-grant legacy accounts that have never been granted any product.
      if (all.length === 0 && user.org_id) {
        await store.grantProductAccess({ userId: user.id, orgId: user.org_id, product: slug, appRole: product.defaultRole });
        grant = await store.getProductAccess(user.id, slug);
      }
    }
    return grant;
  }

  async function checkPassword(user, password) {
    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AuthError(423, "AUTH_LOCKED", `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes.`);
    }
    const ok = await verifyPassword(password, user?.password_hash);
    if (!ok) {
      if (user) {
        const failed = (user.failed_attempts || 0) + 1;
        await store.updateLoginState(user.id, {
          failedAttempts: failed >= LOCK_AFTER ? 0 : failed,
          lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
        });
        await store.audit(user.id, "login_failed", { product: slug });
      }
      throw new AuthError(401, "AUTH_INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    if (user.failed_attempts || user.locked_until) {
      await store.updateLoginState(user.id, { failedAttempts: 0, lockedUntil: null });
    }
  }

  return async function plugin(app) {
    app.post("/register", rate(5), async (req, reply) => {
      try {
        const body = req.body || {};
        const email = normalizeEmail(body.email || body.username);
        const password = body.password ?? body.accessKey;
        assertPasswordPolicy(password);
        const orgName = String(body.organization || body.company || "").trim() || `${email.split("@")[0]}'s workspace`;
        if (orgName.length > 120) throw new AuthError(400, "AUTH_INVALID_ORGANIZATION", "Organization name must be 120 characters or fewer.");

        const existing = await store.findUserByEmail(email);
        if (existing) {
          // One identity, separate product access: an existing account can add this product
          // only by proving it owns the password. Otherwise answer like any duplicate email.
          await checkPassword(existing, password).catch(() => {
            throw new AuthError(409, "AUTH_EMAIL_EXISTS", `An account with this email already exists. Sign in to ${product.name} instead.`);
          });
          if (!(await store.getProductAccess(existing.id, slug))) {
            await store.grantProductAccess({ userId: existing.id, orgId: existing.org_id, product: slug, appRole: product.defaultRole });
            await store.audit(existing.id, "product_access_granted", { product: slug });
          }
          const grant = await store.getProductAccess(existing.id, slug);
          return reply.code(200).send(await issueSession(reply, existing, grant));
        }

        let created;
        try {
          created = await store.createAccount({
            email, passwordHash: await hashPassword(password), orgName,
            name: typeof body.name === "string" ? body.name.trim().slice(0, 120) : null,
            product: slug, appRole: product.defaultRole,
          });
        } catch (err) {
          if (err?.code === "EMAIL_EXISTS") throw new AuthError(409, "AUTH_EMAIL_EXISTS", "An account with this email already exists.");
          throw err;
        }
        await store.audit(created.user.id, "register_success", { product: slug, org_id: created.org.id });
        const grant = await store.getProductAccess(created.user.id, slug);
        return reply.code(201).send(await issueSession(reply, created.user, grant));
      } catch (err) {
        return sendError(reply, err, "AUTH_REGISTER_ERROR");
      }
    });

    app.post("/login", rate(8), async (req, reply) => {
      try {
        const body = req.body || {};
        const password = body.password ?? body.accessKey;
        if (!(body.email || body.username) || !password) {
          throw new AuthError(400, "AUTH_MISSING_FIELDS", "Enter your email address and password.");
        }
        const email = normalizeEmail(body.email || body.username);
        const user = await store.findUserByEmail(email);
        await checkPassword(user, password);
        const grant = await resolveGrant(user);
        if (!grant && !(slug === "nexus-core" && productRole(user) === "admin")) {
          throw new AuthError(403, "AUTH_NO_PRODUCT_ACCESS",
            `This account does not have ${product.name} access yet.`,
            { hint: "Create an account for this product with the same email and password to add access." });
        }
        await store.audit(user.id, "login_success", { product: slug, ip: req.ip });
        return reply.send(await issueSession(reply, user, grant));
      } catch (err) {
        return sendError(reply, err, "AUTH_LOGIN_ERROR");
      }
    });

    app.post("/refresh", rate(120), async (req, reply) => {
      try {
        const raw = req.cookies?.[product.cookieName];
        if (!raw) {
          // One-time migration path for sessions created by the old Nexus Core auth.
          const legacy = slug === "nexus-core" ? req.cookies?.refreshToken : null;
          const legacyUser = legacy ? await store.findUserByLegacyRefreshHash(hashToken(legacy)) : null;
          if (legacyUser) {
            reply.clearCookie("refreshToken", { path: "/api/auth" });
            return reply.send(await issueSession(reply, legacyUser, await resolveGrant(legacyUser)));
          }
          // Visitor was never signed in: nothing to refresh. 204 keeps the browser console clean
          // (every page load checks this) while still meaning "signed out" to the client.
          return reply.code(204).send();
        }
        const session = await store.findSessionByHash(hashToken(raw));
        if (!session || session.product !== slug) throw new AuthError(401, "AUTH_NO_SESSION", "No active session.");
        if (session.revokedAt) {
          // Two tabs (or a page reload that cut off the previous response) can present the same
          // token a few seconds apart. Inside a short grace window, while the family is still live,
          // treat it as that race and hand out a fresh token instead of signing the user out.
          const ageMs = Date.now() - new Date(session.revokedAt).getTime();
          if (ageMs <= reuseGraceMs(env) && (await store.hasActiveSessionInFamily(session.familyId))) {
            const user = await store.findUserById(session.userId);
            const grant = user ? await store.getProductAccess(user.id, slug) : null;
            if (user && (grant || productRole(user) === "admin")) {
              return reply.send(await issueSession(reply, user, grant, session.familyId));
            }
          }
          // Otherwise a rotated token was replayed: assume theft and end every session in this family.
          await store.revokeFamily(session.familyId);
          await store.audit(session.userId, "refresh_reuse_detected", { product: slug });
          reply.clearCookie(product.cookieName, cookieOptions);
          throw new AuthError(401, "AUTH_SESSION_REVOKED", "Your session ended. Sign in again.");
        }
        if (new Date(session.expiresAt) <= new Date()) throw new AuthError(401, "AUTH_SESSION_EXPIRED", "Your session expired. Sign in again.");
        const user = await store.findUserById(session.userId);
        const grant = user ? await store.getProductAccess(user.id, slug) : null;
        if (!user || (!grant && productRole(user) !== "admin")) {
          await store.revokeFamily(session.familyId);
          throw new AuthError(401, "AUTH_NO_SESSION", "No active session.");
        }
        await store.revokeSession(session.id);
        return reply.send(await issueSession(reply, user, grant, session.familyId));
      } catch (err) {
        if (err instanceof AuthError) reply.clearCookie(product.cookieName, cookieOptions);
        return sendError(reply, err, "AUTH_REFRESH_ERROR");
      }
    });

    app.post("/logout", async (req, reply) => {
      const raw = req.cookies?.[product.cookieName];
      if (raw) {
        const session = await store.findSessionByHash(hashToken(raw)).catch(() => null);
        if (session && session.product === slug) await store.revokeFamily(session.familyId).catch(() => {});
      }
      reply.clearCookie(product.cookieName, cookieOptions);
      return reply.send({ success: true });
    });

    app.get("/me", { preHandler: requireProductAuth(slug, { env }) }, async (req, reply) => {
      const user = await store.findUserById(req.user.id);
      const grant = user ? await store.getProductAccess(user.id, slug) : null;
      if (!user || (!grant && productRole(user) !== "admin")) {
        return reply.code(401).send({ error: "AUTH_NO_SESSION", message: "Sign in again." });
      }
      const view = userView(user, grant);
      const subscription = publicSubscription(view.org_id ? await store.getSubscription(view.org_id, slug) : null);
      const payload = { ...view, subscription };
      return reply.send({ ...payload, user: payload, subscription, product: slug });
    });

    app.get("/subscription", { preHandler: requireProductAuth(slug, { env }) }, async (req, reply) => {
      const sub = req.user.org_id ? await store.getSubscription(req.user.org_id, slug) : null;
      return reply.send({ ...publicSubscription(sub), app: slug });
    });

    app.post("/forgot-password", rate(5, "15 minutes"), async (req, reply) => {
      const generic = { success: true, message: "If that email has an account, a reset link is on its way." };
      try {
        const email = normalizeEmail(req.body?.email);
        const user = await store.findUserByEmail(email);
        if (user) {
          const raw = crypto.randomBytes(32).toString("base64url");
          await store.setResetToken(user.id, `${slug}:${hashToken(raw)}`, new Date(Date.now() + RESET_TTL_MS));
          const link = `${frontend}${product.resetPath}?token=${encodeURIComponent(raw)}`;
          await mailer?.sendPasswordReset?.({ to: user.email, link, product: product.name }).catch((e) => req.log.error(e));
          if (!isProd && !mailer?.sendPasswordReset) req.log.info({ link }, "[auth] DEV reset link");
          await store.audit(user.id, "password_reset_requested", { product: slug });
        }
      } catch {
        /* Same answer for invalid emails, so the endpoint cannot be used to discover accounts. */
      }
      return reply.send(generic);
    });

    app.post("/reset-password", rate(5, "15 minutes"), async (req, reply) => {
      try {
        const { token, password } = req.body || {};
        if (typeof token !== "string" || !token) throw new AuthError(400, "AUTH_INVALID_RESET", "This reset link is invalid or has expired.");
        assertPasswordPolicy(password);
        const user = await store.findUserByResetToken(`${slug}:${hashToken(token)}`);
        if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) <= new Date()) {
          throw new AuthError(400, "AUTH_INVALID_RESET", "This reset link is invalid or has expired.");
        }
        await store.updatePassword(user.id, await hashPassword(password));
        // A password change ends every session of this account in every product.
        for (const s of Object.keys((await import("./products.js")).PRODUCTS)) await store.revokeUserSessions(user.id, s);
        await store.audit(user.id, "password_reset", { product: slug });
        return reply.send({ success: true, message: "Password updated. Sign in with your new password." });
      } catch (err) {
        return sendError(reply, err, "AUTH_RESET_ERROR");
      }
    });
  };
}
