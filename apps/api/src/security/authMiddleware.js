// Nexus Core route guards. Kept at this path because goals/executions/admin/audit/stream import it.
// They are Fastify preHandlers now (the old Express-style (req, res, next) version crashed with
// "res.status(...).json is not a function" on every signed-out request and read the wrong claim).
import { optionalProductAuth, requireProductAuth } from "../auth/guard.js";

export const requireAuth = requireProductAuth("nexus-core");
export const verifyNexusAuth = requireAuth;
export const optionalAuth = optionalProductAuth("nexus-core");
export const requireAdmin = requireProductAuth("nexus-core", { roles: ["admin"] });
