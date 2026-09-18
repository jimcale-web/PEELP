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
    const adminUser = await prisma.user.create({
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

    console.log('✅ Admin user created');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   ID: ${userId}`);

    // Create sample instructor
    const instructorId = randomUUID();
    const instructor = await prisma.user.create({
      data: {
        id: instructorId,
        name: 'John Instructor',
        email: 'instructor@example.com',
        emailVerified: true,
        role: 'INSTRUCTOR',
        approvalStatus: 'APPROVED',
        createdAt: now,
        updatedAt: now,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: instructorId,
            providerId: 'credential',
            password: await hashPassword('instructor123'),
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    });

    console.log('✅ Sample instructor created');

    // Create sample students
    const students = [];
    for (let i = 1; i <= 3; i++) {
      const studentId = randomUUID();
      const student = await prisma.user.create({
        data: {
          id: studentId,
          name: `Student ${i}`,
          email: `student${i}@example.com`,
          emailVerified: true,
          role: 'STUDENT',
          approvalStatus: 'APPROVED',
          createdAt: now,
          updatedAt: now,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: studentId,
              providerId: 'credential',
              password: await hashPassword(`student${i}123`),
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      });
      students.push(student);
    }

    console.log('✅ Sample students created (3 students)');

    // Create sample course
    const courseId = randomUUID();
    const course = await prisma.course.create({
      data: {
        id: courseId,
        title: 'Introduction to Web Development',
        description: 'Learn the basics of web development including HTML, CSS, and JavaScript.',
        instructorId: instructor.id,
        createdAt: now,
        updatedAt: now,
      },
    });

    console.log('✅ Sample course created');

    // Create sections
    const sections = [];
    for (let i = 1; i <= 2; i++) {
      const sectionId = randomUUID();
      const section = await prisma.section.create({
        data: {
          id: sectionId,
          title: `Section ${i}: ${i === 1 ? 'HTML Basics' : 'CSS Styling'}`,
          courseId: course.id,
          order: i,
          createdAt: now,
          updatedAt: now,
        },
      });
      sections.push(section);
    }

    console.log('✅ Sample sections created (2 sections)');

    // Create lessons for each section
    for (let s = 0; s < sections.length; s++) {
      for (let l = 1; l <= 2; l++) {
        const lessonId = randomUUID();
        await prisma.lesson.create({
          data: {
            id: lessonId,
            title: `Lesson ${l} - ${sections[s].title.split(':')[1].trim()}`,
            content: `Content for lesson ${l} in section ${s + 1}. This is sample learning material.`,
            sectionId: sections[s].id,
            order: l,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    console.log('✅ Sample lessons created (4 lessons)');

    // Enroll students in course
    for (const student of students) {
      await prisma.enrollment.create({
        data: {
          id: randomUUID(),
          userId: student.id,
          courseId: course.id,
          enrolledAt: now,
          completionPercentage: Math.floor(Math.random() * 100),
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    console.log('✅ Students enrolled in course');

    console.log('\n📚 Seed complete! Database populated with sample LMS data.');
  } catch (error) {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

