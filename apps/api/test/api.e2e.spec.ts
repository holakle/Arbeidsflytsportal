import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';

const shouldRunE2E = process.env.RUN_API_E2E === 'true' && Boolean(process.env.DATABASE_URL);
const maybeDescribe = shouldRunE2E ? describe : describe.skip;

maybeDescribe('API e2e', () => {
  let app: INestApplication;
  let plannerToken: string;
  let technicianToken: string;
  let memberToken: string;
  let foreignPlannerToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-dev-secret';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'workflow-dev';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'workflow-clients';

    plannerToken = jwt.sign(
      {
        sub: '22222222-2222-2222-2222-222222222222',
        email: 'planner@demo.no',
        displayName: 'Planner Demo',
        organizationId: '11111111-1111-1111-1111-111111111111',
        roles: ['planner'],
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: '1h',
      },
    );

    technicianToken = jwt.sign(
      {
        sub: '33333333-3333-3333-3333-333333333333',
        email: 'tech@demo.no',
        displayName: 'Tekniker Demo',
        organizationId: '11111111-1111-1111-1111-111111111111',
        roles: ['technician'],
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: '1h',
      },
    );

    memberToken = jwt.sign(
      {
        sub: '66666666-6666-6666-6666-666666666666',
        email: 'member@demo.no',
        displayName: 'Medlem Demo',
        organizationId: '11111111-1111-1111-1111-111111111111',
        roles: ['member'],
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: '1h',
      },
    );

    foreignPlannerToken = jwt.sign(
      {
        sub: '99999999-0000-0000-0000-000000000001',
        email: 'planner@other.no',
        displayName: 'Planner Other',
        organizationId: 'aaaaaaaa-1111-1111-1111-111111111111',
        roles: ['planner'],
      },
      process.env.JWT_SECRET,
      {
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        expiresIn: '1h',
      },
    );

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /me unauthorized without token', async () => {
    const res = await request(app.getHttpServer()).get('/me');
    expect(res.status).toBe(401);
  });

  it('POST /timesheets allows planner to create on behalf of another user', async () => {
    const res = await request(app.getHttpServer())
      .post('/timesheets')
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        date: '2026-03-03T00:00:00.000Z',
        hours: 2.5,
        activityType: 'ADMIN',
        userId: '33333333-3333-3333-3333-333333333333',
      });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('POST /timesheets blocks member from creating on behalf of another user', async () => {
    const res = await request(app.getHttpServer())
      .post('/timesheets')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        date: '2026-03-03T00:00:00.000Z',
        hours: 1.5,
        activityType: 'ADMIN',
        userId: '33333333-3333-3333-3333-333333333333',
      });
    expect(res.status).toBe(403);
  });

  it('GET /timesheets supports userId for planner and blocks member', async () => {
    const plannerRes = await request(app.getHttpServer())
      .get('/timesheets?userId=33333333-3333-3333-3333-333333333333')
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(plannerRes.status).toBe(200);
    expect(Array.isArray(plannerRes.body)).toBe(true);

    const memberRes = await request(app.getHttpServer())
      .get('/timesheets?userId=33333333-3333-3333-3333-333333333333')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberRes.status).toBe(403);
  });

  it('GET /timesheets/weekly-summary supports userId for planner and blocks member', async () => {
    const plannerRes = await request(app.getHttpServer())
      .get('/timesheets/weekly-summary?userId=33333333-3333-3333-3333-333333333333')
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(plannerRes.status).toBe(200);
    expect(typeof plannerRes.body.totalHours).toBe('number');

    const memberRes = await request(app.getHttpServer())
      .get('/timesheets/weekly-summary?userId=33333333-3333-3333-3333-333333333333')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberRes.status).toBe(403);
  });

  it('GET /equipment/lookup returns found=true for seeded barcode', async () => {
    const res = await request(app.getHttpServer())
      .get('/equipment/lookup?code=wf-lift-20m-001')
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.item?.barcode).toBe('WF-LIFT-20M-001');
  });

  it('GET /equipment/lookup returns found=false for unknown barcode', async () => {
    const res = await request(app.getHttpServer())
      .get('/equipment/lookup?code=WF-UNKNOWN-000')
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
    expect(res.body.status).toBe('NOT_FOUND');
  });

  it('GET /equipment/lookup requires auth token', async () => {
    const res = await request(app.getHttpServer()).get('/equipment/lookup?code=WF-LIFT-20M-001');
    expect(res.status).toBe(401);
  });

  it('GET /equipment/lookup allows technician/member', async () => {
    const tech = await request(app.getHttpServer())
      .get('/equipment/lookup?code=WF-LIFT-20M-001')
      .set('Authorization', `Bearer ${technicianToken}`);
    expect(tech.status).toBe(200);

    const member = await request(app.getHttpServer())
      .get('/equipment/lookup?code=WF-LIFT-20M-001')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(member.status).toBe(200);
  });

  it('POST /equipment/:id/barcode updates barcode for planner', async () => {
    const equipmentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const res = await request(app.getHttpServer())
      .post(`/equipment/${equipmentId}/barcode`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({ barcode: 'wf-test-attach-001' });
    expect(res.status).toBe(201);
    expect(res.body.item.id).toBe(equipmentId);
    expect(res.body.item.barcode).toBe('WF-TEST-ATTACH-001');
  });

  it('POST /equipment/:id/barcode returns 409 when barcode is used by another item', async () => {
    const equipmentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const res = await request(app.getHttpServer())
      .post(`/equipment/${equipmentId}/barcode`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({ barcode: 'WF-LIFT-20M-001' });
    expect(res.status).toBe(409);
  });

  it('POST /equipment/:id/barcode returns 403 for technician/member', async () => {
    const equipmentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const tech = await request(app.getHttpServer())
      .post(`/equipment/${equipmentId}/barcode`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({ barcode: 'WF-TECH-BLOCK-001' });
    expect(tech.status).toBe(403);

    const member = await request(app.getHttpServer())
      .post(`/equipment/${equipmentId}/barcode`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ barcode: 'WF-MEMBER-BLOCK-001' });
    expect(member.status).toBe(403);
  });

  it('cross-tenant attach returns 404', async () => {
    const equipmentId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const res = await request(app.getHttpServer())
      .post(`/equipment/${equipmentId}/barcode`)
      .set('Authorization', `Bearer ${foreignPlannerToken}`)
      .send({ barcode: 'WF-FOREIGN-001' });
    expect(res.status).toBe(404);
  });

  it('GET /schedule scope=all is forbidden for member', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedule?from=2026-03-02T00:00:00.000Z&to=2026-03-09T00:00:00.000Z&scope=all')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /schedule scope=all is allowed for planner', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedule?from=2026-03-02T00:00:00.000Z&to=2026-03-09T00:00:00.000Z&scope=all')
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((event: { type?: string }) => event.type === 'workorder_schedule')).toBe(
      true,
    );
    expect(
      res.body.some((event: { type?: string }) => event.type === 'equipment_reservation'),
    ).toBe(true);
  });

  it('GET /schedule scope=mine returns own/team events for technician', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedule?from=2026-03-02T00:00:00.000Z&to=2026-03-09T00:00:00.000Z&scope=mine')
      .set('Authorization', `Bearer ${technicianToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /schedule with foreign tenant does not leak data', async () => {
    const res = await request(app.getHttpServer())
      .get('/schedule?from=2026-03-02T00:00:00.000Z&to=2026-03-09T00:00:00.000Z&scope=all')
      .set('Authorization', `Bearer ${foreignPlannerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('POST /workorders/:id/schedule validates XOR (user/team)', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/schedule`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        assigneeUserId: '33333333-3333-3333-3333-333333333333',
        assigneeTeamId: '44444444-4444-4444-4444-444444444444',
        startAt: '2026-03-05T08:00:00.000Z',
        endAt: '2026-03-05T10:00:00.000Z',
      });
    expect(res.status).toBe(400);
  });

  it('POST /workorders/:id/assign allows planner as assignee', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/assign`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        assigneeUserId: '22222222-2222-2222-2222-222222222222',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /workorders/:id/schedule allows planner as assignee', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/schedule`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        assigneeUserId: '22222222-2222-2222-2222-222222222222',
        startAt: '2026-03-05T11:00:00.000Z',
        endAt: '2026-03-05T12:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body.assigneeUserId).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('POST /workorders/:id/schedule returns 404 across tenants', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/schedule`)
      .set('Authorization', `Bearer ${foreignPlannerToken}`)
      .send({
        assigneeUserId: '33333333-3333-3333-3333-333333333333',
        startAt: '2026-03-05T08:00:00.000Z',
        endAt: '2026-03-05T10:00:00.000Z',
      });
    expect(res.status).toBe(404);
  });

  it('POST /workorders/:id/consumables works for consumables', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/consumables`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        equipmentItemId: 'abababab-abab-abab-abab-abababababab',
        quantity: 3,
        note: 'e2e register',
      });
    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(3);
  });

  it('POST /workorders/:id/consumables fails for EQUIPMENT item', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/consumables`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        equipmentItemId: '55555555-5555-5555-5555-555555555555',
        quantity: 1,
      });
    expect(res.status).toBe(400);
  });

  it('POST /equipment/reserve fails for CONSUMABLE item', async () => {
    const res = await request(app.getHttpServer())
      .post('/equipment/reserve')
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        equipmentItemId: 'abababab-abab-abab-abab-abababababab',
        workOrderId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        startAt: '2026-03-06T08:00:00.000Z',
        endAt: '2026-03-06T10:00:00.000Z',
      });
    expect(res.status).toBe(400);
  });

  it('DELETE /workorders/:id/schedule/:scheduleId works for planner in same tenant', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const createRes = await request(app.getHttpServer())
      .post(`/workorders/${workOrderId}/schedule`)
      .set('Authorization', `Bearer ${plannerToken}`)
      .send({
        assigneeUserId: '33333333-3333-3333-3333-333333333333',
        startAt: '2026-03-07T08:00:00.000Z',
        endAt: '2026-03-07T10:00:00.000Z',
      });
    expect(createRes.status).toBe(201);

    const scheduleId = createRes.body.id as string;
    const deleteRes = await request(app.getHttpServer())
      .delete(`/workorders/${workOrderId}/schedule/${scheduleId}`)
      .set('Authorization', `Bearer ${plannerToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('DELETE /workorders/:id/schedule/:scheduleId returns 404 across tenants', async () => {
    const workOrderId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const res = await request(app.getHttpServer())
      .delete(`/workorders/${workOrderId}/schedule/18181818-1818-1818-1818-181818181818`)
      .set('Authorization', `Bearer ${foreignPlannerToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /equipment/lookup can hit throttling', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 35; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app.getHttpServer())
        .get(`/equipment/lookup?code=WF-LOAD-${i}`)
        .set('Authorization', `Bearer ${plannerToken}`);
      statuses.push(res.status);
    }
    expect(statuses.some((status) => status === 429)).toBe(true);
  });
});
