import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  throw new Error("SupportOps requires DATABASE_URL to connect to its current shared data store.");
}

export const prisma = globalForPrisma.__supportOpsPrisma ?? new PrismaClient({
  log: isProduction ? ["error"] : ["warn", "error"],
});

if (!isProduction) globalForPrisma.__supportOpsPrisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export default prisma;
