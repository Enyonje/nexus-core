import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcryptjs.hash("Password123!", 10);

  // Create a real user with a generated UUID
  const user = await prisma.user.create({
    data: {
      id: uuidv4(), // ✅ generate UUID
      email: "admin@example.com",
      password_hash: passwordHash,
      name: "Admin User",
    },
  });

  // Create an organization linked to the user
  const org = await prisma.organization.create({
    data: {
      id: uuidv4(),
      name: "Core Organization",
      users: {
        connect: { id: user.id },
      },
    },
  });

  // Create a goal with payload.text
  const goal = await prisma.goal.create({
    data: {
      id: uuidv4(),
      user_id: user.id,
      org_id: org.id,
      title: "Market Analysis Goal",
      description: "Analyze current market trends",
      status: "active",
      goal_type: "analysis",
      payload: {
        text: "Perform a real analysis of current SaaS market trends",
      },
    },
  });

  // Create an objective tied to the goal
  const objective = await prisma.objective.create({
    data: {
      id: uuidv4(),
      user_id: user.id,
      goal_id: goal.id,
      title: "Trend Analysis Objective",
      description: "Identify top 3 SaaS growth areas",
      status: "active",
    },
  });

  // Create an execution tied to the objective
  await prisma.execution.create({
    data: {
      id: uuidv4(),
      user_id: user.id,
      goal_id: goal.id,
      objective_id: objective.id,
      action: "Run SaaS market analysis",
      details: { note: "Execution seeded with real payload" },
      status: "pending",
      version: 1,
      org_id: org.id,
    },
  });

  console.log("✅ Database seeded with user, org, goal, objective, and execution");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });