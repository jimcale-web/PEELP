import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashPassword } from 'better-auth/crypto';
import { randomUUID } from 'crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set before seeding.');
    process.exit(1);
  }
  const adminName = 'Admin User';

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      await prisma.user.delete({
        where: { id: existingUser.id },
      });
      console.log('✅ Deleted existing admin user');
    }

    const userId = randomUUID();
    const now = new Date();
    const hashedPassword = await hashPassword(adminPassword);
    await prisma.user.create({
      data: {
        id: userId,
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        role: 'ADMIN',
        approvalStatus: 'APPROVED',
        createdAt: now,
        updatedAt: now,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: userId,
            providerId: 'credential',
            password: hashedPassword,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    });

    console.log('✅ Seed complete: Admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   ID: ${userId}`);
  } catch (error) {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

