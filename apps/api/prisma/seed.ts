import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ids = {
  organization: '11111111-1111-1111-1111-111111111111',
  planner: '22222222-2222-2222-2222-222222222222',
  tech: '33333333-3333-3333-3333-333333333333',
  member: '66666666-6666-6666-6666-666666666666',
  teamNord: '44444444-4444-4444-4444-444444444444',
  departmentOslo: '77777777-7777-7777-7777-777777777777',
  locationBygdoy: '88888888-8888-8888-8888-888888888888',
  projectMuseum: '99999999-9999-9999-9999-999999999999',
  equipmentLift: '55555555-5555-5555-5555-555555555555',
  equipmentScanner: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  workOrder1: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  workOrder2: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  workOrder3: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  assignment1: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  assignment2: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  reservation1: '12121212-1212-1212-1212-121212121212',
  timesheet1: '13131313-1313-1313-1313-131313131313',
  timesheet2: '14141414-1414-1414-1414-141414141414',
  todo1: '15151515-1515-1515-1515-151515151515',
  todo2: '16161616-1616-1616-1616-161616161616',
};

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: ids.organization },
    update: { name: 'Demo Montage AS' },
    create: { id: ids.organization, name: 'Demo Montage AS' },
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@demo.no' },
    update: { displayName: 'Planner Demo', organizationId: organization.id },
    create: {
      id: ids.planner,
      email: 'planner@demo.no',
      displayName: 'Planner Demo',
      organizationId: organization.id,
    },
  });

  const tech = await prisma.user.upsert({
    where: { email: 'tech@demo.no' },
    update: { displayName: 'Tekniker Demo', organizationId: organization.id },
    create: {
      id: ids.tech,
      email: 'tech@demo.no',
      displayName: 'Tekniker Demo',
      organizationId: organization.id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@demo.no' },
    update: { displayName: 'Medarbeider Demo', organizationId: organization.id },
    create: {
      id: ids.member,
      email: 'member@demo.no',
      displayName: 'Medarbeider Demo',
      organizationId: organization.id,
    },
  });

  const team = await prisma.team.upsert({
    where: { id: ids.teamNord },
    update: { name: 'Team Nord', organizationId: organization.id },
    create: { id: ids.teamNord, name: 'Team Nord', organizationId: organization.id },
  });

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: tech.id } },
    update: {},
    create: { teamId: team.id, userId: tech.id },
  });

  await prisma.teamMembership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: member.id } },
    update: {},
    create: { teamId: team.id, userId: member.id },
  });

  const roleCodes = ['org_admin', 'planner', 'technician', 'member'];
  for (const code of roleCodes) {
    await prisma.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code } },
      update: { name: code },
      create: { organizationId: organization.id, code, name: code },
    });
  }

  const plannerRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, code: 'planner' } });
  const techRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, code: 'technician' } });
  const memberRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, code: 'member' } });

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

  await prisma.userRole.upsert({
    where: { userId_roleId_organizationId: { userId: member.id, roleId: memberRole.id, organizationId: organization.id } },
    update: {},
    create: { userId: member.id, roleId: memberRole.id, organizationId: organization.id },
  });

  const department = await prisma.department.upsert({
    where: { id: ids.departmentOslo },
    update: { name: 'Oslo Vest', organizationId: organization.id },
    create: { id: ids.departmentOslo, name: 'Oslo Vest', organizationId: organization.id },
  });

  const location = await prisma.location.upsert({
    where: { id: ids.locationBygdoy },
    update: { name: 'Bygdoy Hovedbygg', organizationId: organization.id },
    create: { id: ids.locationBygdoy, name: 'Bygdoy Hovedbygg', organizationId: organization.id },
  });

  const project = await prisma.project.upsert({
    where: { id: ids.projectMuseum },
    update: {
      name: 'Museum Ny Fløy',
      organizationId: organization.id,
      departmentId: department.id,
      locationId: location.id,
    },
    create: {
      id: ids.projectMuseum,
      name: 'Museum Ny Fløy',
      organizationId: organization.id,
      departmentId: department.id,
      locationId: location.id,
    },
  });

  await prisma.equipmentItem.upsert({
    where: { id: ids.equipmentLift },
    update: { name: 'Lift 20m', serialNumber: 'LIFT-20-001', active: true },
    create: {
      id: ids.equipmentLift,
      organizationId: organization.id,
      name: 'Lift 20m',
      serialNumber: 'LIFT-20-001',
      active: true,
    },
  });

  await prisma.equipmentItem.upsert({
    where: { id: ids.equipmentScanner },
    update: { name: 'Laser Scanner', serialNumber: 'SCAN-XL-007', active: true },
    create: {
      id: ids.equipmentScanner,
      organizationId: organization.id,
      name: 'Laser Scanner',
      serialNumber: 'SCAN-XL-007',
      active: true,
    },
  });

  const workOrder1 = await prisma.workOrder.upsert({
    where: { id: ids.workOrder1 },
    update: {
      title: 'Monter stålrammer i fløy A',
      description: 'Bruk lift og scanner for justering før feste.',
      status: 'IN_PROGRESS',
      departmentId: department.id,
      locationId: location.id,
      projectId: project.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
      deletedAt: null,
    },
    create: {
      id: ids.workOrder1,
      title: 'Monter stålrammer i fløy A',
      description: 'Bruk lift og scanner for justering før feste.',
      status: 'IN_PROGRESS',
      departmentId: department.id,
      locationId: location.id,
      projectId: project.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
    },
  });

  const workOrder2 = await prisma.workOrder.upsert({
    where: { id: ids.workOrder2 },
    update: {
      title: 'Kabeltrekking sceneområde',
      description: 'Trekk og merk kabler i teknisk rom.',
      status: 'OPEN',
      locationId: location.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
      deletedAt: null,
    },
    create: {
      id: ids.workOrder2,
      title: 'Kabeltrekking sceneområde',
      description: 'Trekk og merk kabler i teknisk rom.',
      status: 'OPEN',
      locationId: location.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
    },
  });

  await prisma.workOrder.upsert({
    where: { id: ids.workOrder3 },
    update: {
      title: 'Sluttkontroll av installasjon',
      description: 'Sjekk låspunkter og mål avvik.',
      status: 'DONE',
      projectId: project.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
      deletedAt: null,
    },
    create: {
      id: ids.workOrder3,
      title: 'Sluttkontroll av installasjon',
      description: 'Sjekk låspunkter og mål avvik.',
      status: 'DONE',
      projectId: project.id,
      createdByUserId: planner.id,
      organizationId: organization.id,
    },
  });

  await prisma.assignment.upsert({
    where: { id: ids.assignment1 },
    update: { workOrderId: workOrder1.id, assigneeUserId: tech.id, assigneeTeamId: null },
    create: { id: ids.assignment1, workOrderId: workOrder1.id, assigneeUserId: tech.id },
  });

  await prisma.assignment.upsert({
    where: { id: ids.assignment2 },
    update: { workOrderId: workOrder2.id, assigneeUserId: null, assigneeTeamId: team.id },
    create: { id: ids.assignment2, workOrderId: workOrder2.id, assigneeTeamId: team.id },
  });

  await prisma.equipmentReservation.upsert({
    where: { id: ids.reservation1 },
    update: {
      equipmentItemId: ids.equipmentLift,
      workOrderId: workOrder1.id,
      startAt: new Date('2026-03-02T07:00:00.000Z'),
      endAt: new Date('2026-03-02T12:00:00.000Z'),
    },
    create: {
      id: ids.reservation1,
      equipmentItemId: ids.equipmentLift,
      workOrderId: workOrder1.id,
      startAt: new Date('2026-03-02T07:00:00.000Z'),
      endAt: new Date('2026-03-02T12:00:00.000Z'),
    },
  });

  await prisma.timesheetEntry.upsert({
    where: { id: ids.timesheet1 },
    update: {
      userId: tech.id,
      organizationId: organization.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      hours: new Prisma.Decimal(6.5),
      activityType: 'INSTALLATION',
      workOrderId: workOrder1.id,
      projectId: project.id,
      note: 'Montering og oppmåling i fløy A',
    },
    create: {
      id: ids.timesheet1,
      userId: tech.id,
      organizationId: organization.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      hours: new Prisma.Decimal(6.5),
      activityType: 'INSTALLATION',
      workOrderId: workOrder1.id,
      projectId: project.id,
      note: 'Montering og oppmåling i fløy A',
    },
  });

  await prisma.timesheetEntry.upsert({
    where: { id: ids.timesheet2 },
    update: {
      userId: tech.id,
      organizationId: organization.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      hours: new Prisma.Decimal(1.5),
      activityType: 'TRAVEL',
      workOrderId: null,
      projectId: project.id,
      note: 'Transport mellom lager og byggeplass',
    },
    create: {
      id: ids.timesheet2,
      userId: tech.id,
      organizationId: organization.id,
      date: new Date('2026-03-01T00:00:00.000Z'),
      hours: new Prisma.Decimal(1.5),
      activityType: 'TRAVEL',
      workOrderId: null,
      projectId: project.id,
      note: 'Transport mellom lager og byggeplass',
    },
  });

  await prisma.todoItem.upsert({
    where: { id: ids.todo1 },
    update: {
      organizationId: organization.id,
      userId: tech.id,
      teamId: null,
      title: 'Send ferdigmelding for WO-1',
      description: 'Oppdater bilder og kommentarfelt før innsending.',
      status: 'OPEN',
      dueDate: new Date('2026-03-03T15:00:00.000Z'),
    },
    create: {
      id: ids.todo1,
      organizationId: organization.id,
      userId: tech.id,
      title: 'Send ferdigmelding for WO-1',
      description: 'Oppdater bilder og kommentarfelt før innsending.',
      status: 'OPEN',
      dueDate: new Date('2026-03-03T15:00:00.000Z'),
    },
  });

  await prisma.todoItem.upsert({
    where: { id: ids.todo2 },
    update: {
      organizationId: organization.id,
      userId: null,
      teamId: team.id,
      title: 'Ukesjekk verktøybil',
      description: 'Sjekk batterier, målere og sikkerhetsutstyr.',
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-03-04T11:00:00.000Z'),
    },
    create: {
      id: ids.todo2,
      organizationId: organization.id,
      teamId: team.id,
      title: 'Ukesjekk verktøybil',
      description: 'Sjekk batterier, målere og sikkerhetsutstyr.',
      status: 'IN_PROGRESS',
      dueDate: new Date('2026-03-04T11:00:00.000Z'),
    },
  });

  const dashboard = await prisma.dashboard.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: planner.id } },
    update: {},
    create: {
      organizationId: organization.id,
      userId: planner.id,
    },
  });

  await prisma.widgetInstance.deleteMany({ where: { dashboardId: dashboard.id } });
  await prisma.widgetInstance.createMany({
    data: [
      { dashboardId: dashboard.id, type: 'MY_WORKORDERS', title: 'Mine arbeidsordre', config: {} },
      { dashboardId: dashboard.id, type: 'BOOKINGS', title: 'Bookinger', config: {} },
      { dashboardId: dashboard.id, type: 'HOURS_THIS_WEEK', title: 'Timer denne uken', config: {} },
      { dashboardId: dashboard.id, type: 'TODO', title: 'Todo', config: {} },
    ],
  });

  await prisma.dashboardLayout.upsert({
    where: { dashboardId: dashboard.id },
    update: {
      columns: 4,
      layout: [
        { widgetIndex: 0, x: 0, y: 0, w: 2, h: 2 },
        { widgetIndex: 1, x: 2, y: 0, w: 2, h: 2 },
        { widgetIndex: 2, x: 0, y: 2, w: 2, h: 2 },
        { widgetIndex: 3, x: 2, y: 2, w: 2, h: 2 },
      ],
    },
    create: {
      dashboardId: dashboard.id,
      columns: 4,
      layout: [
        { widgetIndex: 0, x: 0, y: 0, w: 2, h: 2 },
        { widgetIndex: 1, x: 2, y: 0, w: 2, h: 2 },
        { widgetIndex: 2, x: 0, y: 2, w: 2, h: 2 },
        { widgetIndex: 3, x: 2, y: 2, w: 2, h: 2 },
      ],
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete with sample users, work orders, bookings, timesheets and todos');
}

main().finally(async () => prisma.$disconnect());

