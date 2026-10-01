// security/authMiddleware.js
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters long");
}

export async function requireAuth(req, reply) {
  try {
    // Extract token from Authorization header, cookie, or query
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : req.cookies?.authToken || req.query?.token;

    if (!token) {
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }

    // Verify JWT
    const payload = jwt.verify(token, JWT_SECRET);

    // Attach identity and user claims
    req.identity = payload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      subscription: payload.subscription,
      org_id: payload.org_id,
      company: payload.company,
    };

    // ✅ Fallback: if subscription/role missing, refresh from DB
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
    req.log?.error("Auth verification failed:", err);
    return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
  }
}

export function requireRole(role) {
  return async (req, reply) => {
    if (!req.user || req.user.role !== role) {
      return reply.code(403).send({ error: "AUTH_FORBIDDEN_ROLE" });
    }
  };
}
