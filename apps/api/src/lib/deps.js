// apps/api/supportops/lib/deps.js
// The ONLY place the SupportOps files learn where your existing prisma client and auth middleware live.
// If a path is ever wrong, fix it here, in one spot.
export { prisma } from "../../src/config/prisma.js";
export { requireAuth } from "../../src/security/authMiddleware.js";