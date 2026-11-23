import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma.js';

const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@nexusthecore.com').trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

if (!password || password.length < 14 || password.length > 128) {
  console.error('Set ADMIN_BOOTSTRAP_PASSWORD to a unique password of 14–128 characters.');
  process.exitCode = 1;
} else {
  try {
    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: 'Nexus Core Test Administrator',
        password_hash,
        role: 'admin',
        subscription: 'enterprise',
      },
      update: {
        name: 'Nexus Core Test Administrator',
        password_hash,
        role: 'admin',
        subscription: 'enterprise',
        deleted_at: null,
      },
      select: { id: true, email: true, role: true, subscription: true },
    });
    console.log('Test administrator provisioned:', JSON.stringify(user));
    console.log('No Stripe customer, checkout, or paid subscription was created.');
  } catch (error) {
    console.error('Admin provisioning failed:', error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
