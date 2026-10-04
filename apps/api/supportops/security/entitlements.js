// security/entitlements.js  TEMPORARY version that works with your CURRENT auth (requireAuth + User.role + User.org_id).
// Replace this file with the full central-auth guard later; the route files will not need to change.
import { prisma } from "../config/prisma.js";
import { requireAuth } from "./authMiddleware.js";

// guard({ app: "supportops", roles: ["agent", "management", "admin"] })
export function guard({ roles } = {}) {
    return async (req, reply) => {
        await requireAuth(req, reply);
        if (reply.sent) return; // requireAuth already answered 401

        const user = await prisma.user.findFirst({
            where: { id: req.user.id, deleted_at: null },
            select: { role: true, org_id: true },
        });
        if (!user?.org_id) {
            return reply.code(403).send({ error: "NO_ORGANIZATION", message: "Your account is not part of an organization yet" });
        }

        const appRole = user.role === "admin" ? "admin" : "agent"; // your enum is user | admin
        if (roles && !roles.includes(appRole)) {
            return reply.code(403).send({ error: "ROLE_FORBIDDEN", message: "Your role does not allow this" });
        }
        req.access = { org: { id: user.org_id }, appRole };
    };
}