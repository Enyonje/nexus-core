import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireAuth } from "../security/authMiddleware.js";
import { prisma } from "../config/prisma.js";
import { auditLog } from "../security/auditLog.js";
import { hashToken } from "../lib/crypto.js";
import {
  registerUser,
  loginUser,
  refreshTokens,
  createStripeCheckoutSession,
} from "../services/authService.js";

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function setRefreshCookie(reply, token) {
  if (!token) return;
  reply.setCookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function authRoutes(server) {
  // REGISTER
  server.post("/register", async (req, reply) => {
    try {
      const result = await registerUser(req.body);
      setRefreshCookie(reply, result.rawRefreshToken);
      return reply.send({
        token: result.token,
        user: result.user,
        redirectTo: result.redirectTo || "/",
      });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "AUTH_REGISTER_FAILED",
          message: err.message,
        });
      }
      console.error("Register error:", err);
      return reply.code(500).send({ error: "AUTH_REGISTER_ERROR", message: "Registration failed" });
    }
  });

  // LOGIN
  server.post("/login", async (req, reply) => {
    try {
      const result = await loginUser(req.body);
      setRefreshCookie(reply, result.rawRefreshToken);
      return reply.send({
        token: result.token,
        user: result.user,
        redirectTo: result.redirectTo || "/",
      });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "AUTH_LOGIN_FAILED",
          message: err.message,
        });
      }
      console.error("Login error:", err);
      return reply.code(500).send({ error: "AUTH_LOGIN_ERROR", message: "Login failed" });
    }
  });

  // CURRENT USER SESSION DECODE/VERIFY
  server.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          organization: true,
          role: true,
          subscription: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: "USER_NOT_FOUND", message: "User account no longer exists" });
      }

      return reply.send({ user });
    } catch (err) {
      console.error("Fetch user error:", err);
      return reply.code(500).send({ error: "AUTH_ME_ERROR", message: "Failed to fetch user session" });
    }
  });

  // CROSSBORDER ALIASES
  server.post("/crossborder/auth/register", async (req, reply) => {
    const { email, password, company, organization } = req.body || {};
    req.body = { email, accessKey: password, company, organization: organization || company };

    try {
      const result = await registerUser(req.body);
      setRefreshCookie(reply, result.rawRefreshToken);
      return reply.send({
        token: result.token,
        user: result.user,
        redirectTo: result.redirectTo || "/",
      });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "AUTH_REGISTER_FAILED",
          message: err.message,
        });
      }
      return reply.code(500).send({ error: "AUTH_REGISTER_ERROR", message: "Registration failed" });
    }
  });

  server.post("/crossborder/auth/login", async (req, reply) => {
    const { email, password, mfaCode } = req.body || {};
    req.body = { email, accessKey: password, mfaCode };

    try {
      const result = await loginUser(req.body);
      setRefreshCookie(reply, result.rawRefreshToken);
      return reply.send({
        token: result.token,
        user: result.user,
        redirectTo: result.redirectTo || "/",
      });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "AUTH_LOGIN_FAILED",
          message: err.message,
        });
      }
      return reply.code(500).send({ error: "AUTH_LOGIN_ERROR", message: "Login failed" });
    }
  });

  // REFRESH TOKEN
  server.post("/refresh", async (req, reply) => {
    try {
      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        return reply.code(401).send({ error: "NO_REFRESH_TOKEN", message: "Refresh token missing" });
      }

      const result = await refreshTokens(rawRefreshToken);
      setRefreshCookie(reply, result.rawRefreshToken);
      return reply.send({ token: result.token });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "AUTH_REFRESH_FAILED",
          message: err.message,
        });
      }
      console.error("Refresh error:", err);
      return reply.code(500).send({ error: "AUTH_REFRESH_ERROR", message: "Token refresh failed" });
    }
  });

  // FORGOT PASSWORD
  server.post("/forgot-password", async (req, reply) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return reply.code(400).send({ error: "INVALID_EMAIL", message: "Email is required" });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.send({ success: true, message: "If account exists, reset link sent" });
      }

      const resetToken = generateRandomToken(32);
      const hashedResetToken = hashToken(resetToken);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          reset_token: hashedResetToken,
          reset_token_expires: new Date(Date.now() + 3600 * 1000),
        },
      });

      await auditLog(user.id, "password_reset_requested", {});
      return reply.send({ success: true, message: "If account exists, reset link sent" });
    } catch (err) {
      console.error("Forgot password error:", err);
      return reply.code(500).send({ error: "AUTH_FORGOT_PASSWORD_ERROR", message: "Password reset request failed" });
    }
  });

  // RESET PASSWORD
  server.post("/reset-password", async (req, reply) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword) {
        return reply.code(400).send({ error: "INVALID_PAYLOAD", message: "Token and new password required" });
      }

      const hashedToken = hashToken(token);

      const user = await prisma.user.findFirst({
        where: {
          reset_token: hashedToken,
          reset_token_expires: { gt: new Date() },
        },
      });

      if (!user) {
        return reply.code(400).send({ error: "AUTH_INVALID_RESET_TOKEN", message: "Reset token expired or invalid" });
      }

      const hash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: hash, reset_token: null, reset_token_expires: null },
      });

      await auditLog(user.id, "password_reset_success", {});
      return reply.send({ success: true });
    } catch (err) {
      console.error("Reset password error:", err);
      return reply.code(500).send({ error: "AUTH_RESET_PASSWORD_ERROR", message: "Password reset failed" });
    }
  });

  // SUBSCRIPTION STATUS (Beta mode)
  server.get("/subscription", async (req, reply) => {
    try {
      return reply.send({
        id: "beta-user",
        email: "beta@nexus.com",
        tier: "free",
        active: false,
        role: "user",
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      req.log.error("Subscription error:", err);
      return reply.code(500).send({ error: "AUTH_SUBSCRIPTION_ERROR", message: "Failed to fetch subscription" });
    }
  });

  // STRIPE CHECKOUT
  server.post("/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const sessionId = await createStripeCheckoutSession(
        req.user.id,
        req.user.email,
        req.body?.tier
      );
      return reply.send({ sessionId });
    } catch (err) {
      if (err.code || err.status) {
        return reply.code(err.status || 400).send({
          error: err.code || "STRIPE_CHECKOUT_FAILED",
          message: err.message,
        });
      }
      console.error("Stripe checkout error:", err);
      return reply.code(500).send({ error: "AUTH_STRIPE_ERROR", message: "Checkout creation failed" });
    }
  });

  // OAUTH CALLBACKS
  server.get("/oauth/:provider/callback", async (req, reply) => {
    return reply.send({ success: true, provider: req.params.provider });
  });

  server.post("/external-login", async (req, reply) => {
    return reply.send({ success: true, provider: "external" });
  });
}