// apps/api/supportops/security/entitlements.js
import { prisma, requireAuth } from "../lib/deps.js";

/**
 * Entitlement guard for SupportOps routes.
 * Usage: guard({ app: "supportops", roles: ["agent", "admin"] })
 */
export function guard({ app: appName, roles } = {}) {
    return async (req, reply) => {
        // 1. Run base JWT authentication check
        await requireAuth(req, reply);
        if (reply.sent) return;

        // 2. Safely extract user ID from JWT payload
        const userId = req.user?.id || req.user?.userId || req.user?.sub;
        if (!userId) {
            return reply.code(401).send({
                error: "AUTH_INVALID_TOKEN",
                message: "User identity could not be verified from token"
            });
        }

        // 3. Query DB for organization membership & system role
        const user = await prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true, role: true, org_id: true },
        });

        if (!user || !user.org_id) {
            return reply.code(403).send({
                error: "NO_ORGANIZATION",
                message: "Your account is not part of an organization yet"
            });
        }

        // 4. Map role and evaluate allowed roles list
        const appRole = user.role === "admin" ? "admin" : "agent";
        if (roles && Array.isArray(roles) && !roles.includes(appRole)) {
            return reply.code(403).send({
                error: "ROLE_FORBIDDEN",
                message: "Your role does not allow access to this resource"
            });
        }

        // 5. Populate req.access for downstream ticket controllers
        req.access = {
            org: { id: user.org_id },
            appRole,
            app: appName || "supportops"
        };
    };
}