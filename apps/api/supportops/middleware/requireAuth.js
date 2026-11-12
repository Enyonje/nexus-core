import { requireAuth } from "../lib/auth.js";
export default requireAuth;
export { requireAuth };

export function requireRole(...allowedRoles) {
  return async (request, reply) => {
    if (!request.user) { await requireAuth(request, reply); if (reply.sent) return; }
    if (!allowedRoles.includes(request.user?.role)) {
      return reply.code(403).send({ error: "FORBIDDEN", message: "Insufficient role" });
    }
  };
}
export const requireAdmin = requireRole("admin");
export const requireAgentOrAdmin = requireRole("agent", "admin");
