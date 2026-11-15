import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

/**
 * Extract bearer credentials only from Authorization or the HttpOnly auth cookie.
 * Query-string tokens are deliberately rejected because URLs are routinely logged,
 * copied into browser history and sent as referrers.
 */
function extractToken(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim() || null;
  }
  return req.cookies?.authToken || null;
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
    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "nexus-api",
      audience: "nexus-client",
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
    }

    const dbUser = await prisma.user.findFirst({
      where: { id: payload.sub, deleted_at: null },
      select: { id: true, email: true, role: true, subscription: true, org_id: true },
    });
    if (!dbUser) {
      return reply.code(401).send({ error: "AUTH_ACCOUNT_UNAVAILABLE" });
    }

    req.identity = payload;
    // The database is authoritative for mutable identity and tenant claims.
    // Never trust a stale JWT role or org_id for authorization decisions.
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      subscription: dbUser.subscription,
      org_id: dbUser.org_id,
      company: payload.company,
    };
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

    const payload = jwt.verify(token, JWT_SECRET, {
      issuer: "nexus-api",
      audience: "nexus-client",
    });
    if (typeof payload.sub !== "string" || !payload.sub) {
      req.user = null;
      return;
    }
    const dbUser = await prisma.user.findFirst({
      where: { id: payload.sub, deleted_at: null },
      select: { id: true, email: true, role: true, subscription: true, org_id: true },
    });
    if (!dbUser) {
      req.user = null;
      return;
    }
    req.identity = payload;
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      subscription: dbUser.subscription,
      org_id: dbUser.org_id,
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