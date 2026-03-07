import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import speakeasy from "speakeasy"; // for MFA TOTP
// For email reset, integrate nodemailer or SendGrid
// For OAuth/social login, integrate passport or next-auth

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

/* =========================
   AUTH MIDDLEWARE
========================= */
export function requireAuth(req, reply, done) {
  try {
    let token =
      req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : req.cookies?.authToken || req.query?.token;

    if (!token) {
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    done();
  } catch (err) {
    return reply.code(401).send({ error: "AUTH_INVALID_TOKEN", detail: err.message });
  }
}

export function requireRole(role) {
  return (req, reply, done) => {
    if (!req.identity || req.identity.role !== role) {
      return reply.code(403).send({ error: "AUTH_FORBIDDEN_ROLE" });
    }
    done();
  };
}

/* =========================
   AUDIT LOGGING
========================= */
async function auditLog(userId, event, meta = {}) {
  await prisma.authAudit.create({
    data: {
      id: uuidv4(),
      user_id: userId,
      event,
      meta: JSON.stringify(meta),
      created_at: new Date(),
    },
  });
}

/* =========================
   ROUTES
========================= */
export async function authRoutes(server) {
  // REGISTER
  server.post("/register", async (req, reply) => {
    try {
      const { email, accessKey, organization } = req.body;
      if (!email || !accessKey || !organization) {
        return reply.code(400).send({ error: "AUTH_MISSING_FIELDS" });
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return reply.code(409).send({ error: "AUTH_EMAIL_EXISTS" });
      }

      let org = await prisma.organization.findFirst({ where: { name: organization } });
      if (!org) {
        org = await prisma.organization.create({ data: { id: uuidv4(), name: organization } });
      }

      const hash = await bcrypt.hash(accessKey, 10);
      const refreshToken = crypto.randomBytes(64).toString("hex");

      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          password_hash: hash,
          role: "user",
          subscription: "free",
          org_id: org.id,
          refresh_token: refreshToken,
          failed_attempts: 0,
          locked_until: null,
          mfa_enabled: false,
        },
        select: { id: true, email: true, role: true, subscription: true, org_id: true },
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      await auditLog(user.id, "register_success", {});
      reply.send({ token, user });
    } catch (err) {
      console.error("Register error:", err);
      reply.code(500).send({ error: "AUTH_REGISTER_ERROR", detail: err.message });
    }
  });

  // LOGIN
  server.post("/login", async (req, reply) => {
    try {
      const { email, accessKey, mfaCode } = req.body;
      if (!email || !accessKey) {
        return reply.code(400).send({ error: "AUTH_MISSING_FIELDS" });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        await auditLog(null, "login_failed", { email });
        return reply.code(401).send({ error: "AUTH_USER_NOT_FOUND" });
      }

      // Lockout check
      if (user.locked_until && user.locked_until > new Date()) {
        return reply.code(403).send({ error: "AUTH_ACCOUNT_LOCKED" });
      }

      const valid = await bcrypt.compare(accessKey, user.password_hash);
      if (!valid) {
        const attempts = user.failed_attempts + 1;
        let updateData = { failed_attempts: attempts };
        if (attempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000);
        }
        await prisma.user.update({ where: { id: user.id }, data: updateData });
        await auditLog(user.id, "login_failed", { reason: "wrong_password" });
        return reply.code(401).send({ error: "AUTH_INVALID_PASSWORD" });
      }

      // Reset attempts
      await prisma.user.update({ where: { id: user.id }, data: { failed_attempts: 0, locked_until: null } });

      // MFA check
      if (user.mfa_enabled) {
        const verified = speakeasy.totp.verify({
          secret: user.mfa_secret,
          encoding: "base32",
          token: mfaCode,
        });
        if (!verified) {
          await auditLog(user.id, "login_failed", { reason: "mfa_failed" });
          return reply.code(401).send({ error: "AUTH_MFA_FAILED" });
        }
      }

      const refreshToken = crypto.randomBytes(64).toString("hex");
      await prisma.user.update({ where: { id: user.id }, data: { refresh_token: refreshToken } });

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      await auditLog(user.id, "login_success", {});
      reply.send({ token, user: { id: user.id, email: user.email, role: user.role, subscription: user.subscription, org_id: user.org_id } });
    } catch (err) {
      console.error("Login error:", err);
      reply.code(500).send({ error: "AUTH_LOGIN_ERROR", detail: err.message });
    }
  });

  // REFRESH
  server.post("/refresh", async (req, reply) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return reply.code(401).send({ error: "AUTH_MISSING_REFRESH" });
      }

      const user = await prisma.user.findFirst({ where: { refresh_token: refreshToken } });
      if (!user) {
        return reply.code(401).send({ error: "AUTH_INVALID_REFRESH" });
      }

      const newRefreshToken = crypto.randomBytes(64).toString("hex");
      await prisma.user.update({ where: { id: user.id }, data: { refresh_token: newRefreshToken } });

      const newAccessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      reply.setCookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      await auditLog(user.id, "refresh_success", {});
      reply.send({ token: newAccessToken });
    } catch (err) {
      console.error("Refresh error:", err);
      reply.code(500).send({ error: "AUTH_REFRESH_ERROR", detail: err.message });
    }
  });

  // PASSWORD RESET (simplified)
  server.post("/forgot-password", async (req, reply) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(404).send({ error: "AUTH_USER_NOT_FOUND" });

        const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: resetToken, reset_token_expires: new Date(Date.now() + 3600 * 1000) } // 1h expiry
    });

    // TODO: send resetToken via email (e.g., nodemailer/SendGrid)
    await auditLog(user.id, "password_reset_requested", {});
    reply.send({ success: true, message: "Password reset link sent" });
  });

  server.post("/reset-password", async (req, reply) => {
    const { token, newPassword } = req.body;
    const user = await prisma.user.findFirst({
      where: { reset_token: token, reset_token_expires: { gt: new Date() } }
    });
    if (!user) return reply.code(400).send({ error: "AUTH_INVALID_RESET_TOKEN" });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash, reset_token: null, reset_token_expires: null }
    });

    await auditLog(user.id, "password_reset_success", {});
    reply.send({ success: true });
  });

  // SUBSCRIPTION STATUS
  server.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity?.sub;
      if (!userId) return reply.code(401).send({ error: "AUTH_INVALID_SESSION" });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscription: true } });
      if (!user) return reply.code(404).send({ error: "AUTH_USER_NOT_FOUND" });

      reply.send({ tier: user.subscription, active: user.subscription !== "free" });
    } catch (err) {
      console.error("Subscription fetch failed:", err);
      reply.code(500).send({ error: "AUTH_SUBSCRIPTION_ERROR", detail: err.message });
    }
  });

  // STRIPE CHECKOUT
  server.post("/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { tier } = req.body;
      if (!tier) return reply.code(400).send({ error: "AUTH_MISSING_TIER" });

      const priceId =
        tier === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.identity.email,
        success_url: `${FRONTEND_URL}/subscription?success=1`,
        cancel_url: `${FRONTEND_URL}/subscription`,
        metadata: { tier },
      });

      await auditLog(req.identity.sub, "stripe_checkout", { tier });
      reply.send({ sessionId: session.id });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      reply.code(500).send({ error: "AUTH_STRIPE_ERROR", detail: err.message });
    }
  });

  // Placeholder for OAuth/social login
  server.get("/oauth/:provider/callback", async (req, reply) => {
    // TODO: handle OAuth callback for Google/GitHub/etc.
    reply.send({ success: true, provider: req.params.provider });
  });

  // Placeholder for external identity provider integration (Azure AD, etc.)
  server.post("/external-login", async (req, reply) => {
    // TODO: validate external JWT against provider keys
    reply.send({ success: true, provider: "external" });
  });
}

/* =========================
   Recommendations for Advanced Features
========================= */
// 1. Add account lockout after repeated failed logins.
// 2. Support multi-factor authentication (MFA).
// 3. Add audit logging for all auth events.
// 4. Integrate OAuth/social login providers.
// 5. Allow password reset via email.
// 6. Add session expiration and refresh token rotation.
// 7. Support role-based access control for endpoints.
// 8. Add user activity tracking and analytics.
// 9. Provide detailed error codes for frontend handling.
// 10. Integrate with external identity providers (Azure AD, etc.).