// Shared Nexus API dependencies for legacy route modules.
export { prisma } from "../config/prisma.js";
export { requireAuth, optionalAuth } from "../security/authMiddleware.js";
