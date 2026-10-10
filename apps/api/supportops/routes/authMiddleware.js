// apps/api/supportops/security/authMiddleware.js
import jwt from "jsonwebtoken";

/**
 * Middleware to require authentication.
 * Use in entitlements.js: import { requireAuth } from "./authMiddleware.js";
 */
export async function requireAuth(req, reply) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.code(401).send({ error: "AUTH_REQUIRED" });
    }

    const token = authHeader.slice(7); // remove "Bearer "
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded payload to request
        req.user = {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles || [],
        };
        req.access = {
            org: { id: payload.orgId },
            appRole: payload.appRole || null,
        };
    } catch (err) {
        return reply.code(401).send({ error: "INVALID_TOKEN" });
    }
}
