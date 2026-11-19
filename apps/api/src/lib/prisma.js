// Reuse the API-wide Prisma client. Never create another connection pool here.
export { prisma as default, prisma } from "../config/prisma.js";
