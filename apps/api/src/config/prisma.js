// apps/api/src/config/prisma.js
// One shared Prisma client for the whole API. Import it as:  import { prisma } from "../config/prisma.js";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add it to your environment (Render > Environment).");
}

const isProd = process.env.NODE_ENV === "production";

// In development, hot reloads would create a new client (and a new connection pool) on every restart.
// Keeping it on globalThis reuses a single one.
const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.__prisma ??
    new PrismaClient({
        log: isProd ? ["error"] : ["warn", "error"],
    });

if (!isProd) globalForPrisma.__prisma = prisma;

// Close the database connections cleanly when the server stops.
export async function disconnectPrisma() {
    await prisma.$disconnect();
}

export default prisma;