import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import speakeasy from "speakeasy";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Helper to hash tokens before storing them in DB
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* =========================
   AUTH MIDDLEWARE
========================= */
export function requireAuth(req, reply, done) {
  try {
    let token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies?.authToken || req.query?.token;

    if (!token) {
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    req.identity = payload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      org_id: payload.org_id,
    };

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
async function auditLog(userId, action, meta = {}) {
  try {
    await prisma.authAudit.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        action,
        details: meta,
        created_at: new Date(),
      },
    });
  } catch (err) {
    console.error("Audit log failed to write:", err);
  }
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

      // Safe organization resolution using an upsert to avoid race conditions
      const org = await prisma.organization.upsert({
        where: { name: organization }, // Assumes unique constraint on name field
        update: {},
        create: { id: uuidv4(), name: organization },
      });

      const hash = await bcrypt.hash(accessKey, 10);
      const rawRefreshToken = crypto.randomBytes(64).toString("hex");
      const hashedRefreshToken = hashToken(rawRefreshToken);

      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          password_hash: hash,
          role: "user",
          subscription: "free",
          org_id: org.id,
          refresh_token: hashedRefreshToken, // Storing cryptographic hash
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

      reply.setCookie("refreshToken", rawRefreshToken, {
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

      await prisma.user.update({ where: { id: user.id }, data: { failed_attempts: 0, locked_until: null } });

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

      const rawRefreshToken = crypto.randomBytes(64).toString("hex");
      const hashedRefreshToken = hashToken(rawRefreshToken);
      
      await prisma.user.update({ 
        where: { id: user.id }, 
        data: { refresh_token: hashedRefreshToken } 
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      reply.setCookie("refreshToken", rawRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      await auditLog(user.id, "login_success", {});
      reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
          org_id: user.org_id,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      reply.code(500).send({ error: "AUTH_LOGIN_ERROR", detail: err.message });
    }
  });

  // REFRESH
  server.post("/refresh", async (req, reply) => {
    try {
      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        return reply.code(401).send({ error: "AUTH_MISSING_REFRESH" });
      }

      const hashedRefreshToken = hashToken(rawRefreshToken);
      // Fixed: Lookup by hashed value to shield database compromises
      const user = await prisma.user.findFirst({ where: { refresh_token: hashedRefreshToken } });
      if (!user) {
        return reply.code(401).send({ error: "AUTH_INVALID_REFRESH" });
      }

      const newRawRefreshToken = crypto.randomBytes(64).toString("hex");
      const newHashedRefreshToken = hashToken(newRawRefreshToken);
      
      await prisma.user.update({ 
        where: { id: user.id }, 
        data: { refresh_token: newHashedRefreshToken } 
      });

      const newAccessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      reply.setCookie("refreshToken", newRawRefreshToken, {
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

  // PASSWORD RESET
  server.post("/forgot-password", async (req, reply) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Security note: In enterprise apps, consider returning a 200 generic message 
      // even if user isn't found to protect against account enumeration.
      if (!user) return reply.code(404).send({ error: "AUTH_USER_NOT_FOUND" });

      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedResetToken = hashToken(resetToken);

      await prisma.user.update({
        where: { id: user.id },
        data: { 
          reset_token: hashedResetToken, 
          reset_token_expires: new Date(Date.now() + 3600 * 1000) 
        }
      });

      await auditLog(user.id, "password_reset_requested", {});
      
      // NOTE: You'll want to append the raw `resetToken` to your outbound link.
      reply.send({ success: true, message: "Password reset link generated successfully" });
    } catch (err) {
      console.error("Forgot password error:", err);
      reply.code(500).send({ error: "AUTH_FORGOT_PASSWORD_ERROR", detail: err.message });
    }
  });

  server.post("/reset-password", async (req, reply) => {
    try {
      const { token, newPassword } = req.body;
      const hashedToken = hashToken(token);

      const user = await prisma.user.findFirst({
        where: { reset_token: hashedToken, reset_token_expires: { gt: new Date() } }
      });
      if (!user) return reply.code(400).send({ error: "AUTH_INVALID_RESET_TOKEN" });

      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: hash, reset_token: null, reset_token_expires: null }
      });

      await auditLog(user.id, "password_reset_success", {});
      reply.send({ success: true });
    } catch (err) {
      console.error("Reset password error:", err);
      reply.code(500).send({ error: "AUTH_RESET_PASSWORD_ERROR", detail: err.message });
    }
  });

  // SUBSCRIPTION STATUS
  server.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.user?.id;
      if (!userId) return reply.code(401).send({ error: "AUTH_INVALID_SESSION" });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscription: true }
      });
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

      if (!priceId) {
        return reply.code(400).send({ error: "AUTH_INVALID_TIER" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.user.email,
        success_url: `${FRONTEND_URL}/subscription?success=1`,
        cancel_url: `${FRONTEND_URL}/subscription`,
        metadata: { tier },
      });

      await auditLog(req.user.id, "stripe_checkout", { tier });
      reply.send({ sessionId: session.id });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      reply.code(500).send({ error: "AUTH_STRIPE_ERROR", detail: err.message });
    }
  });

  /* =========================
     IDENTITY INTEGRATION PADS
  ========================= */
  server.get("/oauth/:provider/callback", async (req, reply) => {
    // Ready for passport-fastify or basic OAuth2 strategy hooks
    reply.send({ success: true, provider: req.params.provider });
  });

  server.post("/external-login", async (req, reply) => {
    // Ready for SAML2 / OIDC token translation hooks (e.g. Azure AD)
    reply.send({ success: true, provider: "external" });
  });
}