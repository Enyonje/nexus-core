// Shared SupportOps dependencies. SupportOps deliberately uses the same
// Prisma client and canonical Nexus identity middleware as the host API.
export { prisma } from "../../src/config/prisma.js";
export { requireAuth, optionalAuth } from "../../src/security/authMiddleware.js";
