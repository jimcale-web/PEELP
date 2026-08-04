import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { email: 'admin@peelp.local' },
    update: { name: 'PEELP Admin' },
    create: {
      email: 'admin@peelp.local',
      name: 'PEELP Admin',
    },
  });

  console.log('Seed complete: default admin user ensured.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });