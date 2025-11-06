import request from 'supertest';

// make env values strings (TS-safe)
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

/** ---- Swagger spec ---- */
jest.mock('../swagger', () => ({
  swaggerSpec: { openapi: '3.0.0', info: { title: 'TrackMyDegree API', version: '1.0.0' } },
}));

/** ---- DB controller for /test-db ---- */
const getConnection = jest.fn();
jest.mock('@controllers/DBController/DBController', () => ({
  __esModule: true,
  default: { getConnection },
}));

/** ---- Virtual router factory (bypass alias resolution) ---- */
const makeVirtualRouter = () => {
  const { Router } = require('express');
  const r = Router();
  r.get('/__ping', (_req: any, res: any) => res.status(200).send('ok'));
  return { __esModule: true, default: r };
};

// Mock each @routes/* as a VIRTUAL module so Jest doesn't resolve to disk
jest.mock('@routes/auth',           () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/courses',        () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/exemption',      () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/deficiency',     () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/degree',         () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/timeline',       () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/coursepool',     () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/userData',       () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/adminRoutes',    () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/requisite',      () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/feedback',       () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/session',        () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/sectionsRoutes', () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/transcript',     () => makeVirtualRouter(), { virtual: true });
jest.mock('@routes/mongo',          () => makeVirtualRouter(), { virtual: true });

/** ---- Import AFTER mocks ---- */
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
    getConnection.mockResolvedValueOnce(fakePool);

    const res = await request(app).get('/test-db');
    expect(res.status).toBe(200);
    expect(res.body?.message).toMatch(/Database connected successfully/i);
    expect(res.body?.result?.[0]?.number).toBe(1);
  });

  it('GET /test-db -> 500 when DB connection is undefined', async () => {
    getConnection.mockResolvedValueOnce(undefined);

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
