import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: { id: '11111111-1111-1111-1111-111111111111', name: 'Demo Montage AS' },
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@demo.no' },
    update: {},
    create: {
      email: 'planner@demo.no',
      displayName: 'Planner Demo',
      organizationId: organization.id,
      id: '22222222-2222-2222-2222-222222222222',
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: 'tech@demo.no' },
    update: {},
    create: {
      email: 'tech@demo.no',
      displayName: 'Tekniker Demo',
      organizationId: organization.id,
      id: '33333333-3333-3333-3333-333333333333',
    },
  });

  const team = await prisma.team.upsert({
    where: { id: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: { id: '44444444-4444-4444-4444-444444444444', name: 'Team Nord', organizationId: organization.id },
  });

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: tech.id } },
    update: {},
    create: { teamId: team.id, userId: tech.id },
  });

  const roleCodes = ['org_admin', 'planner', 'technician', 'member'];
  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code } },
      update: {},
      create: { organizationId: organization.id, code, name: code },
    });
  }

  const plannerRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, code: 'planner' } });
  const techRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, code: 'technician' } });

  await prisma.userRole.upsert({
    where: { userId_roleId_organizationId: { userId: planner.id, roleId: plannerRole.id, organizationId: organization.id } },
    update: {},
    create: { userId: planner.id, roleId: plannerRole.id, organizationId: organization.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_organizationId: { userId: tech.id, roleId: techRole.id, organizationId: organization.id } },
    update: {},
    create: { userId: tech.id, roleId: techRole.id, organizationId: organization.id },
  });

  await prisma.equipmentItem.upsert({
    where: { id: '55555555-5555-5555-5555-555555555555' },
    update: {},
    create: {
      id: '55555555-5555-5555-5555-555555555555',
      organizationId: organization.id,
      name: 'Lift 20m',
      serialNumber: 'LIFT-20-001',
      active: true,
    },
  });
}

main().finally(async () => prisma.$disconnect());

