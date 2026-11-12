import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || "nexus-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "nexus-client";

function tokenFromRequest(request) {
  const header = request.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) return header.slice(7).trim();
  return request.cookies?.authToken || request.cookies?.accessToken || null;
}

async function resolveIdentity(request, reply, optional = false) {
  try {
    if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters");
    const token = tokenFromRequest(request);
    if (!token) {
      if (optional) { request.user = null; return; }
      return reply.code(401).send({ error: "AUTH_MISSING_TOKEN" });
    }
    const payload = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
    const userId = typeof payload.sub === "string" ? payload.sub : payload.id;
    if (!userId) {
      if (optional) { request.user = null; return; }
      return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
    }
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true, email: true, name: true, role: true, subscription: true, org_id: true },
    });
    if (!user) {
      if (optional) { request.user = null; return; }
      return reply.code(401).send({ error: "AUTH_ACCOUNT_UNAVAILABLE" });
    }
    request.identity = payload;
    request.user = { ...user, company: payload.company || null };
  } catch (error) {
    if (optional) { request.user = null; return; }
    request.log?.warn({ err: error }, "SupportOps authentication rejected");
    return reply.code(401).send({ error: "AUTH_INVALID_TOKEN" });
  }
}

export async function requireAuth(request, reply) {
  return resolveIdentity(request, reply, false);
}

export async function optionalAuth(request, reply) {
  return resolveIdentity(request, reply, true);
}
