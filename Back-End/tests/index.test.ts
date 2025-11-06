import request from 'supertest';

/**
 * Keep the server from binding to 8000 during tests
 * (index.ts reads PORT eagerly)
 */
(process.env as any).PORT = '0';
(process.env as any).NODE_ENV = 'test';


/** ---- Mocks for heavy external deps ---- */

// Sentry + profiling
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(() => ({})),
}));

// Swagger spec (avoid loading real file or parser)
jest.mock('../swagger', () => ({
  swaggerSpec: { openapi: '3.0.0', info: { title: 'TrackMyDegree API', version: '1.0.0' } },
}));

// DB controller for /test-db
const getConnection = jest.fn();
jest.mock('@controllers/DBController/DBController', () => ({
  __esModule: true,
  default: { getConnection },
}));

// Provide lightweight routers so mounting succeeds without side-effects
const makeRouterMock = () => {
  const { Router } = require('express');
  const r = Router();
  // An optional ping for sanity, not used in assertions
  r.get('/__ping', (_req: any, res: any) => res.status(200).send('ok'));
  return { __esModule: true, default: r };
};

jest.mock('@routes/auth',           () => makeRouterMock());
jest.mock('@routes/courses',        () => makeRouterMock());
jest.mock('@routes/exemption',      () => makeRouterMock());
jest.mock('@routes/deficiency',     () => makeRouterMock());
jest.mock('@routes/degree',         () => makeRouterMock());
jest.mock('@routes/timeline',       () => makeRouterMock());
jest.mock('@routes/coursepool',     () => makeRouterMock());
jest.mock('@routes/userData',       () => makeRouterMock());
jest.mock('@routes/adminRoutes',    () => makeRouterMock());
jest.mock('@routes/requisite',      () => makeRouterMock());
jest.mock('@routes/feedback',       () => makeRouterMock());
jest.mock('@routes/session',        () => makeRouterMock());
jest.mock('@routes/sectionsRoutes', () => makeRouterMock());
jest.mock('@routes/transcript',     () => makeRouterMock());
jest.mock('@routes/mongo',          () => makeRouterMock());

// Rate-limiters / error handlers can be left real if they’re lightweight.
// If they cause issues, you can stub them like routers above.

/** ---- Import the app AFTER mocks ---- */
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
    // fake pool/request/query chain
    const fakePool = {
      request: () => ({
        query: async (_sql: string) => ({ recordset: [{ number: 1 }] }),
      }),
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
