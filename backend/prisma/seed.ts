import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  const adminName = 'Admin User';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  try {
    // Delete existing admin user if exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      await prisma.account.deleteMany({
        where: { userId: existingUser.id },
      });
      await prisma.user.delete({
        where: { email: adminEmail },
      });
      console.log('✅ Deleted existing admin user');
    }

    // Use the sign-up endpoint to create the admin user
    const response = await fetch(`${backendUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': backendUrl,
      },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      }),
    });

    const data = await response.json() as { user?: { id: string } };

    if (data.user) {
      // Update the role to ADMIN
      await prisma.user.update({
        where: { id: data.user.id },
        data: { role: 'ADMIN', emailVerified: true },
      });

      console.log(`✅ Seed complete: Admin user created`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log(`   ID: ${data.user.id}`);
    } else {
      console.error('Failed to create admin user:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


