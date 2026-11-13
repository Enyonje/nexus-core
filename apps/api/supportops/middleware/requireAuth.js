/**
 * Fastify Require Authentication & Authorization Middleware
 * Path: middleware/requireAuth.js
 */

/**
 * 1. requireAuth Middleware (Default Export)
 * Verifies JWT token and attaches full user record from PostgreSQL
 */
export default async function requireAuth(request, reply) {
    try {
        // Verify JWT bearer token
        await request.jwtVerify();
    } catch (err) {
        return reply.code(401).send({
            error: "UNAUTHORIZED",
            message: "Authentication required. Invalid or expired token.",
        });
    }

    // Retrieve user payload from token
    const userId = request.user?.sub || request.user?.id;

    if (!userId) {
        return reply.code(401).send({
            error: "INVALID_TOKEN",
            message: "Token payload missing user identity",
        });
    }

    const client = await request.server.pg.connect();
    try {
        const query = `
        SELECT id, email, name, role, org_id, subscription 
        FROM users 
        WHERE id = $1 AND deleted_at IS NULL
      `;
        const res = await client.query(query, [userId]);
        const user = res.rows[0];

        if (!user) {
            return reply.code(401).send({
                error: "USER_NOT_FOUND",
                message: "User account associated with token does not exist",
            });
        }

        // Attach current user object to Fastify request context
        request.currentUser = user;
    } catch (err) {
        request.log.error({ err }, "Authentication database lookup failed");
        return reply.code(500).send({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to resolve authenticated user state",
        });
    } finally {
        client.release();
    }
}

/**
 * Named alias export for named import compatibility:
 * import { requireAuth } from "../middleware/requireAuth.js"
 */
export { requireAuth };

/**
 * 2. requireRole Middleware Factory
 * Restricts endpoint access to specific roles (e.g. "admin", "agent")
 */
export function requireRole(...allowedRoles) {
    return async (request, reply) => {
        // Ensure requireAuth has run first
        if (!request.currentUser) {
            await requireAuth(request, reply);
            if (reply.sent) return;
        }

        if (!allowedRoles.includes(request.currentUser.role)) {
            return reply.code(403).send({
                error: "FORBIDDEN",
                message: `Forbidden: Requires one of the following roles: [${allowedRoles.join(", ")}]`,
            });
        }
    };
}

/**
 * 3. PreHandler Shortcuts
 */
export const requireAdmin = requireRole("admin");
export const requireAgentOrAdmin = requireRole("agent", "admin");