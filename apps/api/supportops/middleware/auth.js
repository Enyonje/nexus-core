/**
 * Fastify Authentication & Authorization Middleware
 * Path: middleware/auth.js
 */

/**
 * 1. Verify JWT Token from Authorization Header (Bearer <token>)
 */
export async function authenticate(request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        return reply.code(401).send({
            error: "UNAUTHORIZED",
            message: "Invalid or expired authentication token",
        });
    }
}

/**
 * Export alias to resolve named import references like:
 * import { authMiddleware } from "../middleware/auth.js"
 */
export const authMiddleware = authenticate;

/**
 * 2. Verify JWT and Attach Full User Record from PostgreSQL Database
 */
export async function attachCurrentUser(request, reply) {
    // Ensure token is verified first
    if (!request.user || (!request.user.sub && !request.user.id)) {
        await authenticate(request, reply);
        if (reply.sent) return;
    }

    const userId = request.user.sub || request.user.id;
    const client = await request.server.pg.connect();
    try {
        const res = await client.query(
            `SELECT id, email, name, role, org_id, subscription 
             FROM users 
             WHERE id = $1 AND deleted_at IS NULL`,
            [userId]
        );

        const user = res.rows[0];

        if (!user) {
            return reply.code(401).send({
                error: "USER_NOT_FOUND",
                message: "User account no longer exists or has been deactivated",
            });
        }

        // Attach full database user to request context
        request.currentUser = user;
    } catch (err) {
        request.log.error(err);
        return reply.code(500).send({
            error: "INTERNAL_SERVER_ERROR",
            message: "Failed to authenticate request context",
        });
    } finally {
        client.release();
    }
}

/**
 * 3. Role-Based Access Control (RBAC) Guard Factory
 * @param   {...string} allowedRoles - e.g. authorizeRoles("admin", "agent")
 */
export function authorizeRoles(...allowedRoles) {
    return async (request, reply) => {
        // Populate user if not attached yet
        if (!request.currentUser) {
            await attachCurrentUser(request, reply);
            if (reply.sent) return;
        }

        if (!allowedRoles.includes(request.currentUser.role)) {
            return reply.code(403).send({
                error: "FORBIDDEN",
                message: `Permission denied. Required role: ${allowedRoles.join(" or ")}`,
            });
        }
    };
}

/**
 * 4. PreHandler Guard Shortcuts
 */
export const requireAdmin = authorizeRoles("admin");
export const requireAgent = authorizeRoles("admin", "agent");

// Default export for default import convenience
export default authenticate;