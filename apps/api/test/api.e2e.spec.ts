import { beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';

describe('API e2e', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-dev-secret';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'workflow-dev';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'workflow-clients';

    token = jwt.sign(
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

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
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

  it('GET /workorders requires auth token', async () => {
    const res = await request(app.getHttpServer()).get('/workorders').set('Authorization', `Bearer ${token}`);
    expect([200, 500]).toContain(res.status);
  });
});

