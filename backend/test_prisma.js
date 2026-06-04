const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.organization.findMany();
    if (orgs.length === 0) {
      console.log("No organizations found");
      return;
    }
    const org = orgs[0];
    console.log("Found org:", org.id);

    const project = await prisma.project.create({
      data: {
        name: "Test Project",
        orgId: org.id,
        status: "ACTIVE"
      }
    });
    console.log("Project created:", project);
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
