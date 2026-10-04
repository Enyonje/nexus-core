/**
 * Entitlements & Access Control
 * Path: supportops/security/entitlements.js
 *
 * Provides route guards to enforce role-based access and permissions.
 */

/**
 * Guard middleware for Fastify routes.
 * Checks if the current user has the required role(s) or permissions.
 *
 * @param {string[]} allowedRoles - Array of roles allowed to access the route
 * @returns {Function} Fastify preHandler function
 */
export function guard(allowedRoles = []) {
    return async function (request, reply) {
        const user = request.currentUser || request.user;

        if (!user) {
            return reply.code(401).send({
                error: "UNAUTHORIZED",
                message: "No authenticated user found",
            });
        }

        const role = user.role || user.subscription || "user";

        if (!allowedRoles.includes(role)) {
            return reply.code(403).send({
                error: "FORBIDDEN",
                message: `Role "${role}" is not permitted to access this resource`,
            });
        }

        // If allowed, continue
    };
}

/**
 * Example helper: check if user is admin
 */
export function isAdmin(user) {
    return user?.role === "admin" || user?.subscription === "management";
}

/**
 * Example helper: check if user is agent
 */
export function isAgent(user) {
    return user?.role === "agent" || user?.role === "user";
}

/**
 * Example helper: check if user is investor
 */
export function isInvestor(user) {
    return user?.role === "investor";
}
