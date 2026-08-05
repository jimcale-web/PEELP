import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

  // Hash the password using bcrypt
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Generate a unique ID for the user
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();

  // Upsert the admin user
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin User', role: 'ADMIN' },
    create: {
      id: userId,
      email: adminEmail,
      name: 'Admin User',
      role: 'ADMIN',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create or update the account with the hashed password
  await prisma.account.upsert({
    where: { id: accountId },
    update: {
      password: hashedPassword,
    },
    create: {
      id: accountId,
      accountId: 'email',
      providerId: 'email',
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`✅ Seed complete: Admin user created`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });