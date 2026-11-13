import { verifyAccessToken } from "./tokens.js";
import { getProduct } from "./products.js";

function bearer(req) {
  const header = req.headers?.authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

function toIdentity(payload) {
  return {
    id: payload.sub,
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    org_id: payload.org_id ?? null,
    orgId: payload.org_id ?? null,
    product: payload.product,
    sid: payload.sid,
  };
}

/**
 * Fastify preHandler that only accepts access tokens issued for `slug`.
 * Sets req.user and req.identity (both shapes are used by older routes).
 *   requireProductAuth("compliance")
 *   requireProductAuth("nexus-core", { roles: ["admin"] })
 */
export function requireProductAuth(slug, { roles, env = process.env } = {}) {
  getProduct(slug);
  return async function productAuthGuard(req, reply) {
    const token = bearer(req);
    if (!token) {
      return reply.code(401).send({ error: "AUTH_REQUIRED", message: "Sign in to continue." });
    }
    let payload;
    try {
      payload = verifyAccessToken(slug, token, env);
    } catch {
      return reply.code(401).send({ error: "AUTH_INVALID_TOKEN", message: "Your session has expired. Sign in again." });
    }
    const identity = toIdentity(payload);
    if (roles?.length && !roles.includes(identity.role)) {
      return reply.code(403).send({ error: "FORBIDDEN", message: "Your role does not allow this action." });
    }
    req.user = identity;
    req.identity = identity;
  };
}

/** Same as requireProductAuth but never blocks; req.user stays undefined when there is no valid token. */
export function optionalProductAuth(slug, { env = process.env } = {}) {
  return async function optionalGuard(req) {
    const token = bearer(req);
    if (!token) return;
    try {
      const identity = toIdentity(verifyAccessToken(slug, token, env));
      req.user = identity;
      req.identity = identity;
    } catch {
      /* ignore */
    }
  };
}
