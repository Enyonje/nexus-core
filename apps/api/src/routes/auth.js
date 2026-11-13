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

// ============================================================
// CONFIGURATION
// ============================================================

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://nexusthecore.com"
).replace(/\/$/, "");

const DEFAULT_TIER = process.env.DEFAULT_TIER || "free";
const DEFAULT_APP_SLUG = process.env.DEFAULT_APP_SLUG || "nexus-core";

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;

const COOKIE_SAMESITE = [
  "strict",
  "lax",
  "none",
].includes(process.env.COOKIE_SAMESITE)
  ? process.env.COOKIE_SAMESITE
  : "strict";

// ============================================================
// RATE LIMITING
// ============================================================

const limit = (max, timeWindow = "1 minute") => ({
  config: {
    rateLimit: {
      max,
      timeWindow,
    },
  },
});

// ============================================================
// TOKEN GENERATION
// ============================================================

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

// ============================================================
// REFRESH COOKIE
// ============================================================

const cookieBase = () => ({
  httpOnly: true,
  secure:
    process.env.NODE_ENV === "production" ||
    COOKIE_SAMESITE === "none",
  sameSite: COOKIE_SAMESITE,
  path: "/api/auth",
});

function setRefreshCookie(reply, token) {
  if (!token) return;

  reply.setCookie("refreshToken", token, {
    ...cookieBase(),
    maxAge: 30 * 24 * 60 * 60,
  });
}

// ============================================================
// PRIVILEGED FIELD PROTECTION
// ============================================================

const PRIVILEGED_FIELDS = [
  "id",
  "user_id",
  "role",
  "roles",
  "is_admin",
  "isAdmin",
  "admin",
  "is_platform_admin",
  "permissions",
  "subscription",
  "tier",
  "plan",
  "plan_id",
  "status",
  "verified",
  "email_verified",
  "emailVerified",
  "org_id",
  "organization_id",
  "stripe_customer_id",
  "created_at",
  "createdAt",
  "refresh_token",
  "reset_token",
  "mfa_secret",
];

function withoutPrivileged(body) {
  const clean = { ...body };

  for (const key of PRIVILEGED_FIELDS) {
    delete clean[key];
  }

  return clean;
}

// ============================================================
// ERROR HANDLING
// ============================================================

function publicError(
  reply,
  err,
  fallbackCode,
  fallbackMessage
) {
  if (err.code || err.status) {
    return reply.code(err.status || 400).send({
      error: err.code || fallbackCode,
      message: err.message || fallbackMessage,
    });
  }

  console.error(`${fallbackCode}:`, err);

  return reply.code(500).send({
    error: fallbackCode,
    message: fallbackMessage,
  });
}

// ============================================================
// REDIRECT RESOLUTION
// ============================================================

function resolveRedirectPath(
  user,
  defaultPath = "/dashboard",
  requestIntent = null
) {
  const intent = requestIntent || user?.intent;

  if (intent === "supportops") {
    return "/supportops";
  }

  if (
    intent === "explore_agents" ||
    intent === "agents"
  ) {
    return "/agents";
  }

  if (
    intent === "launch_swarm" ||
    intent === "dashboard"
  ) {
    return "/dashboard";
  }

  if (!user) return defaultPath;

  // Resolve product from AppAccess relations.
  const apps = user.appAccess || [];

  if (
    apps.some(
      (access) =>
        access.app?.slug === "supportops"
    )
  ) {
    return "/supportops";
  }

  if (
    apps.some(
      (access) =>
        ["nexus-core", "nexus"].includes(access.app?.slug)
    )
  ) {
    return "/dashboard";
  }

  return defaultPath;
}

// ============================================================
// ORGANIZATION SECURITY
// ============================================================

async function callerOrgId(req, user) {
  const own = user.org_id ||
    (typeof user.organization === "string"
      ? user.organization
      : user.organization?.id);
  const requested = req.headers["x-org-id"];

  if (!requested) return own || null;

  // Workspace switching is allowed only after verifying a live membership.
  // Do not silently assume the user's primary org is their only organization.
  const membership = await prisma.membership.findFirst({
    where: {
      user_id: user.id,
      org_id: String(requested),
      org: { deleted_at: null },
    },
    select: { org_id: true },
  });
  return membership?.org_id || null;
}

// ============================================================
// SUBSCRIPTION RESPONSE
// ============================================================

function publicSubscription(record) {
  return {
    tier: record?.plan?.key || DEFAULT_TIER,
    plan_id: record?.plan_id || null,
    // No subscription is not an active free subscription. Keep UI and API
    // authorization state aligned so an unprovisioned workspace cannot appear subscribed.
    status: record?.status || "inactive",
    app: record?.app?.slug || DEFAULT_APP_SLUG,
  };
}

// ============================================================
// SUBSCRIPTION LOOKUP
// ============================================================

async function loadSubscription(req, user) {
  const orgId = await callerOrgId(req, user);

  if (
    orgId === null &&
    req.headers["x-org-id"]
  ) {
    return { forbidden: true };
  }

  if (!orgId) {
    return { record: null };
  }

  const requestedApp =
    req.headers["x-app-slug"];

  const appSlug =
    typeof requestedApp === "string" &&
      /^[a-z0-9-]+$/i.test(requestedApp)
      ? requestedApp
      : DEFAULT_APP_SLUG;

  const record = await prisma.subscription.findFirst({
    where: {
      org_id: orgId,
      app: {
        slug: appSlug,
      },
    },
    include: {
      plan: true,
      app: true,
    },
  });

  return {
    record: record || null,
  };
}

// ============================================================
// PASSWORD RESET DELIVERY
// ============================================================

async function deliverResetLink(user, token) {
  const link =
    `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    const mailer = await import(
      "../services/mailer.js"
    );

    if (
      typeof mailer.sendPasswordResetEmail === "function"
    ) {
      await mailer.sendPasswordResetEmail(
        user.email,
        link
      );

      return;
    }
  } catch (err) {
    if (err?.code !== "ERR_MODULE_NOT_FOUND") {
      console.error(
        "[auth] Reset email failed:",
        err.message
      );
    }
  }

  console.warn(
    "[auth] Password reset email service unavailable."
  );

  if (process.env.NODE_ENV !== "production") {
    console.info(
      "[auth] DEV ONLY reset link:",
      link
    );
  }
}

// ============================================================
// AUTH ROUTES
// ============================================================

export async function authRoutes(server) {

  // ==========================================================
  // REGISTER
  // ==========================================================

  server.post(
    "/register",
    limit(5),
    async (req, reply) => {
      try {
        const body = withoutPrivileged(
          req.body || {}
        );

        const requestedIntent =
          body.intent === "supportops"
            ? "supportops"
            : body.intent || "launch_swarm";

        const email = (
          body.email || body.username || ""
        ).trim().toLowerCase();

        const accessKey =
          body.accessKey || body.password;

        if (!email || !accessKey) {
          return reply.code(400).send({
            error: "AUTH_MISSING_FIELDS",
            message: "Email and password are required.",
          });
        }

        if (
          typeof accessKey !== "string" ||
          accessKey.length < MIN_PASSWORD ||
          accessKey.length > MAX_PASSWORD ||
          Buffer.byteLength(accessKey, "utf8") > 72
        ) {
          return reply.code(400).send({
            error: "WEAK_PASSWORD",
            message:
              "Password must be 10-128 characters and no more than 72 UTF-8 bytes.",
          });
        }

        const payload = {
          ...body,
          email,
          accessKey,
          intent: requestedIntent,
        };

        const result = await registerUser(payload);

        setRefreshCookie(
          reply,
          result.rawRefreshToken
        );

        if (result.user) {
          result.user.intent = requestedIntent;
        }

        const redirectTo =
          requestedIntent === "supportops"
            ? "/supportops"
            : result.redirectTo ||
            resolveRedirectPath(
              result.user,
              "/dashboard",
              requestedIntent
            );

        return reply.send({
          token: result.token,
          user: result.user,
          redirectTo,
        });

      } catch (err) {
        return publicError(
          reply,
          err,
          "AUTH_REGISTER_ERROR",
          "Registration failed"
        );
      }
    }
  );

  // ==========================================================
  // LOGIN
  // ==========================================================

  server.post(
    "/login",
    limit(8),
    async (req, reply) => {
      try {
        const body = req.body || {};

        const identifier = (
          body.email || body.username || ""
        ).trim().toLowerCase();

        const secret =
          body.password || body.accessKey;

        if (!identifier || !secret) {
          return reply.code(400).send({
            error: "AUTH_MISSING_FIELDS",
            message:
              "Both email and password/accessKey are required.",
          });
        }

        const result = await loginUser({
          ...body,
          email: identifier,
          username: identifier,
          password: secret,
          accessKey: secret,
        });

        setRefreshCookie(
          reply,
          result.rawRefreshToken
        );

        if (result.user?.id) {
          await auditLog(
            result.user.id,
            "login_success",
            { ip: req.ip }
          ).catch(() => { });
        }

        const redirectTo =
          body.intent === "supportops"
            ? "/supportops"
            : result.redirectTo ||
            resolveRedirectPath(
              result.user,
              "/dashboard",
              body.intent
            );

        return reply.send({
          token: result.token,
          user: result.user,
          redirectTo,
        });

      } catch (err) {
        return publicError(
          reply,
          err,
          "AUTH_LOGIN_ERROR",
          "Login failed"
        );
      }
    }
  );

  // ==========================================================
  // LOGOUT
  // ==========================================================

  server.post(
    "/logout",
    async (req, reply) => {
      reply.clearCookie(
        "refreshToken",
        cookieBase()
      );

      return reply.send({
        success: true,
        message: "Logged out successfully",
      });
    }
  );

  // ==========================================================
  // CURRENT USER
  // ==========================================================

  server.get(
    "/me",
    {
      preHandler: requireAuth,
    },
    async (req, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: req.user.id,
          },
          select: {
            id: true,
            email: true,
            role: true,
            org_id: true,
            subscription: true,
            created_at: true,

            organization: true,

            appAccess: {
              include: {
                app: {
                  select: {
                    slug: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (!user) {
          return reply.code(404).send({
            error: "USER_NOT_FOUND",
            message: "User account no longer exists.",
          });
        }

        let subscription =
          publicSubscription(null);

        try {
          const {
            forbidden,
            record,
          } = await loadSubscription(req, user);

          if (forbidden) {
            return reply.code(403).send({
              error: "ORG_FORBIDDEN",
              message:
                "You do not belong to that organization.",
            });
          }

          if (record) {
            subscription =
              publicSubscription(record);
          }

        } catch (err) {
          console.error(
            "Subscription lookup failed:",
            err.message
          );

          return reply.code(503).send({
            error: "SUBSCRIPTION_UNAVAILABLE",
            message:
              "Could not load your plan. Please retry.",
          });
        }

        const userPayload = {
          ...user,
          createdAt: user.created_at,
          subscription,
        };

        const redirectTo =
          resolveRedirectPath(
            userPayload,
            "/dashboard"
          );

        return reply.send({
          ...userPayload,
          user: userPayload,
          redirectTo,
        });

      } catch (err) {
        console.error("Fetch user error:", err);

        return reply.code(500).send({
          error: "AUTH_ME_ERROR",
          message: "Failed to fetch user session.",
        });
      }
    }
  );

  // ==========================================================
  // CROSSBORDER REGISTER
  // ==========================================================

  server.post(
    "/crossborder/auth/register",
    limit(5),
    async (req, reply) => {
      try {
        const {
          email,
          password,
          company,
          organization,
          intent,
        } = req.body || {};

        if (!email || !password) {
          return reply.code(400).send({
            error: "AUTH_MISSING_FIELDS",
            message: "Email and password are required.",
          });
        }

        if (
          typeof password !== "string" ||
          password.length < MIN_PASSWORD ||
          password.length > MAX_PASSWORD ||
          Buffer.byteLength(password, "utf8") > 72
        ) {
          return reply.code(400).send({
            error: "WEAK_PASSWORD",
            message: "Invalid password length.",
          });
        }

        const result = await registerUser({
          email: email.trim().toLowerCase(),
          accessKey: password,
          company,
          organization: organization || company,
          intent,
        });

        setRefreshCookie(
          reply,
          result.rawRefreshToken
        );

        return reply.send({
          token: result.token,
          user: result.user,
          redirectTo: "/crossborder",
        });

      } catch (err) {
        return publicError(
          reply,
          err,
          "AUTH_REGISTER_ERROR",
          "Registration failed"
        );
      }
    }
  );

  // ==========================================================
  // CROSSBORDER LOGIN
  // ==========================================================

  server.post(
    "/crossborder/auth/login",
    limit(8),
    async (req, reply) => {
      try {
        const {
          email,
          password,
          mfaCode,
        } = req.body || {};

        const result = await loginUser({
          email,
          accessKey: password,
          mfaCode,
        });

        setRefreshCookie(
          reply,
          result.rawRefreshToken
        );

        return reply.send({
          token: result.token,
          user: result.user,
          redirectTo: "/crossborder",
        });

      } catch (err) {
        return publicError(
          reply,
          err,
          "AUTH_LOGIN_ERROR",
          "Login failed"
        );
      }
    }
  );

  // ==========================================================
  // REFRESH TOKEN
  // ==========================================================

  server.post(
    "/refresh",
    limit(30),
    async (req, reply) => {
      try {
        const rawRefreshToken =
          req.cookies?.refreshToken;

        if (!rawRefreshToken) {
          return reply.code(401).send({
            error: "NO_REFRESH_TOKEN",
            message: "Refresh token missing.",
          });
        }

        const result = await refreshTokens(
          rawRefreshToken
        );

        setRefreshCookie(
          reply,
          result.rawRefreshToken
        );

        return reply.send({
          token: result.token,
          accessToken: result.token,
        });

      } catch (err) {
        reply.clearCookie(
          "refreshToken",
          cookieBase()
        );

        return publicError(
          reply,
          err,
          "AUTH_REFRESH_ERROR",
          "Token refresh failed"
        );
      }
    }
  );

  // ==========================================================
  // FORGOT PASSWORD
  // ==========================================================

  server.post(
    "/forgot-password",
    limit(3),
    async (req, reply) => {
      const generic = {
        success: true,
        message:
          "If account exists, reset link sent.",
      };

      try {
        const { email } = req.body || {};

        if (
          !email ||
          typeof email !== "string"
        ) {
          return reply.code(400).send({
            error: "INVALID_EMAIL",
            message: "Email is required.",
          });
        }

        const normalizedEmail =
          email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
        });

        if (!user) {
          return reply.send(generic);
        }

        const resetToken =
          generateRandomToken(32);

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            reset_token: hashToken(resetToken),
            reset_token_expires: new Date(
              Date.now() + 3600 * 1000
            ),
          },
        });

        await auditLog(
          user.id,
          "password_reset_requested",
          {}
        );

        deliverResetLink(
          user,
          resetToken
        ).catch((err) =>
          console.error(
            "[auth] deliverResetLink:",
            err.message
          )
        );

        return reply.send(generic);

      } catch (err) {
        console.error(
          "Forgot password error:",
          err
        );

        return reply.code(500).send({
          error: "AUTH_FORGOT_PASSWORD_ERROR",
          message: "Password reset request failed.",
        });
      }
    }
  );

  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  server.post(
    "/reset-password",
    limit(5),
    async (req, reply) => {
      try {
        const {
          token,
          newPassword,
        } = req.body || {};

        if (
          !token ||
          !newPassword ||
          typeof newPassword !== "string"
        ) {
          return reply.code(400).send({
            error: "INVALID_PAYLOAD",
            message: "Token and new password required.",
          });
        }

        if (
          newPassword.length < MIN_PASSWORD ||
          newPassword.length > MAX_PASSWORD ||
          Buffer.byteLength(newPassword, "utf8") > 72
        ) {
          return reply.code(400).send({
            error: "WEAK_PASSWORD",
            message:
              "Password must be 10-128 characters and no more than 72 UTF-8 bytes.",
          });
        }

        const user = await prisma.user.findFirst({
          where: {
            reset_token: hashToken(token),
            reset_token_expires: {
              gt: new Date(),
            },
          },
        });

        if (!user) {
          return reply.code(400).send({
            error: "AUTH_INVALID_RESET_TOKEN",
            message: "Reset token expired or invalid.",
          });
        }

        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            password_hash: await bcrypt.hash(
              newPassword,
              12
            ),
            reset_token: null,
            reset_token_expires: null,
            refresh_token: null,
            refresh_token_expires: null,
          },
        });

        await auditLog(
          user.id,
          "password_reset_success",
          {}
        );

        return reply.send({
          success: true,
          message:
            "Password successfully updated. Please log in again.",
        });

      } catch (err) {
        console.error(
          "Reset password error:",
          err
        );

        return reply.code(500).send({
          error: "AUTH_RESET_PASSWORD_ERROR",
          message: "Password reset failed.",
        });
      }
    }
  );

  // ==========================================================
  // SUBSCRIPTION STATUS
  // ==========================================================

  server.get(
    "/subscription",
    {
      preHandler: requireAuth,
    },
    async (req, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: {
            id: req.user.id,
          },
          select: {
            id: true,
            email: true,
            role: true,
            org_id: true,
            created_at: true,
            organization: true,
          },
        });

        if (!user) {
          return reply.code(404).send({
            error: "USER_NOT_FOUND",
            message: "User account not found.",
          });
        }

        let record = null;

        try {
          const result =
            await loadSubscription(req, user);

          if (result.forbidden) {
            return reply.code(403).send({
              error: "ORG_FORBIDDEN",
              message:
                "You do not belong to that organization.",
            });
          }

          record = result.record;

        } catch (err) {
          console.error(
            "Subscription lookup failed:",
            err.message
          );

          return reply.code(503).send({
            error: "SUBSCRIPTION_UNAVAILABLE",
            message:
              "Could not load your plan. Please retry.",
          });
        }

        const subscription =
          publicSubscription(record);

        return reply.send({
          id: user.id,
          email: user.email,
          tier: subscription.tier,
          plan_id: subscription.plan_id,
          app: subscription.app,
          active: record
            ? ["active", "trialing"].includes(record.status)
            : false,
          status: record?.status || "inactive",
          role: user.role || "user",
          org_id: user.org_id,
          created_at: user.created_at,
        });

      } catch (err) {
        console.error(
          "Subscription error:",
          err
        );

        return reply.code(500).send({
          error: "AUTH_SUBSCRIPTION_ERROR",
          message: "Failed to fetch subscription.",
        });
      }
    }
  );

  // ==========================================================
  // STRIPE CHECKOUT
  // ==========================================================

  server.post(
    "/stripe/checkout",
    {
      preHandler: requireAuth,
      ...limit(10),
    },
    async (req, reply) => {
      try {
        const tier = req.body?.tier;

        if (
          !["pro", "enterprise"].includes(tier)
        ) {
          return reply.code(400).send({
            error: "AUTH_INVALID_TIER",
            message: "Invalid subscription tier.",
          });
        }

        const sessionId =
          await createStripeCheckoutSession(
            req.user.id,
            req.user.email,
            tier
          );

        return reply.send({
          sessionId,
        });

      } catch (err) {
        return publicError(
          reply,
          err,
          "AUTH_STRIPE_ERROR",
          "Checkout creation failed"
        );
      }
    }
  );

  // ==========================================================
  // OAUTH
  // ==========================================================

  server.get(
    "/oauth/:provider",
    async (req, reply) =>
      reply.code(501).send({
        error: "OAUTH_NOT_IMPLEMENTED",
        message:
          "Social sign-in is not available yet.",
      })
  );

  server.get(
    "/oauth/:provider/callback",
    async (req, reply) =>
      reply.code(501).send({
        error: "OAUTH_NOT_IMPLEMENTED",
        message:
          "Social sign-in is not available yet.",
      })
  );

  server.post(
    "/external-login",
    async (req, reply) =>
      reply.code(501).send({
        error: "EXTERNAL_LOGIN_NOT_IMPLEMENTED",
        message:
          "External login is not available.",
      })
  );
}

export default authRoutes;
