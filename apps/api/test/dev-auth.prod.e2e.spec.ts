import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

const shouldRunE2E = process.env.RUN_API_E2E === 'true' && Boolean(process.env.DATABASE_URL);
const maybeDescribe = shouldRunE2E ? describe : describe.skip;

maybeDescribe('DevAuth disabled in production', () => {
  let app: INestApplication;
  const oldNodeEnv = process.env.NODE_ENV;
  const oldEnableDevAuth = process.env.ENABLE_DEV_AUTH;

  beforeAll(async () => {
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_DEV_AUTH = 'false';
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'change-this-dev-secret';
    process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'workflow-dev';
    process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'workflow-clients';

    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = oldNodeEnv;
    process.env.ENABLE_DEV_AUTH = oldEnableDevAuth;
  });

  it('GET /dev-auth/users returns 404', async () => {
    const res = await request(app.getHttpServer()).get('/dev-auth/users');
    expect(res.status).toBe(404);
  });

  it('POST /dev-auth/token returns 404', async () => {
    const res = await request(app.getHttpServer()).post('/dev-auth/token').send({ userId: 'x' });
    expect(res.status).toBe(404);
  });
});
