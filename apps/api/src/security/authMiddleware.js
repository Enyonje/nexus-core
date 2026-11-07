import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

/**
 * Extracts raw token string from request headers, cookies, or query parameters.
 */
function extractToken(req) {
  return req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.authToken || req.query?.token || null;
}

/**
 * STRICT AUTHENTICATION (Pre-handler hook for Fastify)
 * Rejects unauthenticated requests with a 401 Unauthorized status.
 */
export async function requireAuth(req, reply) {
  try {
    const token = extractToken(req);

    if (!token) {
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }

    // Verify JWT payload
    const payload = jwt.verify(token, JWT_SECRET);

    req.identity = payload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      subscription: payload.subscription,
      org_id: payload.org_id,
      company: payload.company,
    };

    // Fallback: Refresh role/subscription from database if missing in token
    if (!req.user.subscription || !req.user.role) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { subscription: true, role: true },
      });

      if (dbUser) {
        req.user.subscription = dbUser.subscription;
        req.user.role = dbUser.role;
      }
    }
  } catch (err) {
    req.log?.error({ err }, "Auth verification failed");
    return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
  }
}

/**
 * OPTIONAL AUTHENTICATION (Pre-handler hook for Fastify)
 * Populates req.user if a valid token exists, otherwise sets req.user = null (guest mode).
 * Never throws a 401 error.
 */
export async function optionalAuth(req, reply) {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      return;
    }

    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      subscription: payload.subscription,
      org_id: payload.org_id,
      company: payload.company,
    };
  } catch (err) {
    // Graceful fallback to guest session on invalid token
    req.user = null;
  }
}

/**
 * DEVELOPMENT BYPASS GUARD (Pre-handler hook for Fastify)
 * Bypasses auth checks ONLY in local development environments when flag is set.
 */
export async function devBypassGuard(req, reply) {
  if (process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_BYPASS_AUTH === "true") {
    req.user = {
      id: "dev-admin-id",
      email: "dev-admin@local.test",
      role: "admin",
      subscription: "enterprise",
      permissions: ["*"],
    };
    return;
  }

  // Fallback to strict authentication
  return requireAuth(req, reply);
}

/**
 * ROLE-BASED ACCESS GUARD
 * Restricts access based on user role (e.g., 'admin', 'user').
 */
export function requireRole(role) {
  return async (req, reply) => {
    if (!req.user || req.user.role !== role) {
      return reply.code(403).send({ error: "AUTH_FORBIDDEN_ROLE" });
    }
  };
}