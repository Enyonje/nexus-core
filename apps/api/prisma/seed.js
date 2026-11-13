// prisma/seed.js — creates (or promotes) the platform admin from environment variables.
//   ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='a long unique password' node prisma/seed.js
// Never commit real credentials here.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to seed the admin account.");
  }
  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "admin", is_platform_admin: true },
    create: { id: crypto.randomUUID(), email, password_hash: hash, role: "admin", is_platform_admin: true, subscription: "enterprise", name: "Platform Admin" },
    select: { id: true, email: true, role: true },
  });
  console.log("Admin account ensured:", admin.email);
}

main()
  .catch((e) => {
    console.error("Seed error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
