// The single adapter through which SupportOps accesses shared Nexus services.
export { prisma } from "../../src/config/prisma.js";
export { requireAuth, optionalAuth } from "../../src/security/authMiddleware.js";
