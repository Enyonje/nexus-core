// apps/api/supportops/security/entitlements.js
import { prisma, requireAuth } from "../lib/deps.js";

export class AccessError extends Error {
    constructor(status, code, message, extra = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
}

export const invalidateSubscription = (orgId, appId) => {
    // implement cache invalidation or subscription reset logic here
    console.log(`Invalidating subscription for org ${orgId}, app ${appId}`);
};

function guard({ app: appName, roles } = {}) {
    return async (req, reply) => {
        await requireAuth(req, reply);
        if (reply.sent) return;

        const userId = req.user?.id || req.user?.userId || req.user?.sub;
        if (!userId) {
            return reply.code(401).send({
                error: "AUTH_INVALID_TOKEN",
                message: "User identity could not be verified from token",
            });
        }

        const user = await prisma.user.findFirst({
            where: { id: userId, deleted_at: null },
            select: { id: true, role: true, org_id: true },
        });

        if (!user || !user.org_id) {
            return reply.code(403).send({
                error: "NO_ORGANIZATION",
                message: "Your account is not part of an organization yet",
            });
        }

        const appRole = user.role === "admin" ? "admin" : "agent";
        if (roles && Array.isArray(roles) && !roles.includes(appRole)) {
            return reply.code(403).send({
                error: "ROLE_FORBIDDEN",
                message: "Your role does not allow access to this resource",
            });
        }

        req.access = {
            org: { id: user.org_id },
            appRole,
            app: appName || "supportops",
        };
    };
}

export default guard;
export { guard };
