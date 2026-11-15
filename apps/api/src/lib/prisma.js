import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function testConnection() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log("✅ Connected:", result);
  } catch (err) {
    console.error("❌ Prisma connection failed:", err.message);
  }
}

testConnection();