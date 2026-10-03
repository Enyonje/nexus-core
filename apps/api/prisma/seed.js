// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  const email = "nyonjes@gmail.com";
  const password = "atimmytheboy22"; // change before deploying

  const hash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "superadmin", // promote if already exists
    },
    create: {
      id: uuidv4(),
      email,
      password_hash: hash,
      role: "superadmin",
      subscription: "enterprise",
      name: "Super Admin",
    },
    select: { id: true, email: true, role: true },
  });

  console.log("Superadmin account ensured:", superAdmin);
}

main()
  .catch(e => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });