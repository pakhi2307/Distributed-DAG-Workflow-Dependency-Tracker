const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log("Users:", users.map(u => ({ id: u.id, email: u.email, orgId: u.orgId })));
    
    const projects = await prisma.project.findMany();
    console.log("Projects:", projects.map(p => ({ id: p.id, name: p.name, orgId: p.orgId })));

    const orgs = await prisma.organization.findMany();
    console.log("Orgs:", orgs.map(o => ({ id: o.id, name: o.name })));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
