import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // Clear existing data to avoid conflicts on re-runs
  await prisma.auditLog.deleteMany();
  await prisma.handshake.deleteMany();
  await prisma.moduleDependency.deleteMany();
  await prisma.module.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Create Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corp (Seeded)',
    },
  });

  console.log(`✅ Created Organization: ${org.name}`);

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users (Admin, Manager, Member)
  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Alice Admin',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const manager1 = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Bob Manager',
      email: 'bob@acme.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      orgId: org.id,
      name: 'Charlie Manager',
      email: 'charlie@acme.com',
      password: hashedPassword,
      role: 'MANAGER',
    },
  });

  console.log('✅ Created Users (Admin, Managers)');

  // Create Project
  const project = await prisma.project.create({
    data: {
      orgId: org.id,
      name: 'Q3 Enterprise Launch',
    },
  });

  console.log(`✅ Created Project: ${project.name}`);

  // Create Modules
  const moduleA = await prisma.module.create({
    data: {
      projectId: project.id,
      ownerId: manager1.id,
      title: 'Frontend Architecture',
      status: 'COMPLETED',
      specification: '<p>Initial setup for React, Next.js, and Tailwind CSS.</p>',
    },
  });

  const moduleB = await prisma.module.create({
    data: {
      projectId: project.id,
      ownerId: manager2.id,
      title: 'Backend API Gateway',
      status: 'IN_PROGRESS',
      specification: '<p>API Gateway routing rules for microservices.</p>',
    },
  });

  const moduleC = await prisma.module.create({
    data: {
      projectId: project.id,
      ownerId: manager1.id,
      title: 'Database Schema Design',
      status: 'PENDING_HANDSHAKE',
      specification: '<p>PostgreSQL schema with Prisma ORM.</p>',
    },
  });

  console.log('✅ Created Modules');

  // Create Dependencies (DAG)
  // Module B depends on Module A
  // Module C depends on Module B
  await prisma.moduleDependency.createMany({
    data: [
      { moduleId: moduleB.id, dependsOnId: moduleA.id },
      { moduleId: moduleC.id, dependsOnId: moduleB.id },
    ],
  });
  console.log('✅ Created Module Dependencies (DAG Structure)');

  // Create Handshakes
  await prisma.handshake.create({
    data: {
      fromModuleId: moduleA.id,
      toModuleId: moduleB.id,
      initiatedById: manager1.id,
      status: 'ACCEPTED',
      resolvedAt: new Date(),
    },
  });

  await prisma.handshake.create({
    data: {
      fromModuleId: moduleB.id,
      toModuleId: moduleC.id,
      initiatedById: manager2.id,
      status: 'PENDING',
    },
  });
  console.log('✅ Created Handshakes');

  console.log('🎉 Seeding Complete! You can login with admin@acme.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
