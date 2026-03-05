import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Hash a password securely
  const passwordHash = await bcryptjs.hash("Password123!", 10);

  // Create a test user
  const user = await prisma.user.create({
    data: {
      id: "seed-user-uuid", // or let Prisma generate uuid()
      email: "admin@example.com",
      password_hash: passwordHash,   // ✅ correct field name
      name: "Admin User",
    },
  });

  // Create a sample goal for the user
  await prisma.goal.create({
    data: {
      user_id: user.id,
      title: "Seeded Goal",
      description: "This goal was seeded automatically",
      status: "active",
      goal_type: "analysis",
    },
  });

  console.log("✅ Database seeded with test user and goal");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });