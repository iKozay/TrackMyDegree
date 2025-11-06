import request from 'supertest';

// TS-safe env tweaks for tests
(process.env as any).PORT = '0';
(process.env as any).NODE_ENV = 'test';

/** ---- Sentry + profiling ---- */
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(() => ({})),
}));

/** ---- Swagger spec (lightweight stub) ---- */
jest.mock('../swagger', () => ({
  swaggerSpec: { openapi: '3.0.0', info: { title: 'TrackMyDegree API', version: '1.0.0' } },
}));

/** ---- DB controller for /test-db (prefix with mock*) ---- */
const mockGetConnection = jest.fn();
jest.mock('@controllers/DBController/DBController', () => ({
  __esModule: true,
  default: { getConnection: mockGetConnection },
}));

/** ---- Router stub factory ---- */
const makeRouterStub = () => {
  const { Router } = require('express');
  const r = Router();
  r.get('/__ping', (_req: any, res: any) => res.status(200).send('ok'));
  return { __esModule: true, default: r };
};

/**
 * IMPORTANT:
 * Mock the *resolved physical paths* for routers, not the @routes/* alias.
 * This avoids the moduleNameMapper collision in CI.
 */
jest.mock('../routes/auth',           () => makeRouterStub());
jest.mock('../routes/courses',        () => makeRouterStub());
jest.mock('../routes/exemption',      () => makeRouterStub());
jest.mock('../routes/deficiency',     () => makeRouterStub());
jest.mock('../routes/degree',         () => makeRouterStub());
jest.mock('../routes/timeline',       () => makeRouterStub());
jest.mock('../routes/coursepool',     () => makeRouterStub());
jest.mock('../routes/userData',       () => makeRouterStub());
jest.mock('../routes/adminRoutes',    () => makeRouterStub());
jest.mock('../routes/requisite',      () => makeRouterStub());
jest.mock('../routes/feedback',       () => makeRouterStub());
jest.mock('../routes/session',        () => makeRouterStub());
jest.mock('../routes/sectionsRoutes', () => makeRouterStub());
jest.mock('../routes/transcript',     () => makeRouterStub());
jest.mock('../routes/mongo',          () => makeRouterStub());

/** ---- Import app AFTER all mocks ---- */
import app from '../index';
import * as Sentry from '@sentry/node';

describe('index.ts', () => {
  it('serves /openapi.json (Swagger spec)', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body?.openapi).toBe('3.0.0');
  });

  it('GET /test-db -> 200 when DB connection succeeds', async () => {
    const fakePool = {
      request: () => ({ query: async () => ({ recordset: [{ number: 1 }] }) }),
    } as any;
    mockGetConnection.mockResolvedValueOnce(fakePool);

    const res = await request(app).get('/test-db');
    expect(res.status).toBe(200);
    expect(res.body?.message).toMatch(/Database connected successfully/i);
    expect(res.body?.result?.[0]?.number).toBe(1);
  });

  it('GET /test-db -> 500 when DB connection is undefined', async () => {
    mockGetConnection.mockResolvedValueOnce(undefined);

    const res = await request(app).get('/test-db');
    expect(res.status).toBe(500);
    expect(res.body?.message).toMatch(/Database connection failed/i);
  });

  it('captures unhandledRejection via Sentry', () => {
    const err = new Error('boom');
    process.emit('unhandledRejection' as any, err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
