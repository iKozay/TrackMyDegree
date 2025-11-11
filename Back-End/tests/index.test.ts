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
  swaggerSpec: {
    openapi: '3.0.0',
    info: { title: 'TrackMyDegree API', version: '1.0.0' },
  },
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
jest.mock('../routes/authRoutes', () => makeRouterStub());
jest.mock('../routes/courseRoutes', () => makeRouterStub());
jest.mock('../routes/degreeRoutes', () => makeRouterStub());
jest.mock('../routes/timelineRoutes', () => makeRouterStub());
jest.mock('../routes/coursepoolRoutes', () => makeRouterStub());
jest.mock('../routes/userRoutes', () => makeRouterStub());
jest.mock('../routes/adminRoutes', () => makeRouterStub());
jest.mock('../routes/feedbackRoutes', () => makeRouterStub());
jest.mock('../routes/sectionsRoutes', () => makeRouterStub());
jest.mock('../routes/uploadRoutes', () => makeRouterStub());

/** ---- Import app AFTER all mocks ---- */
import app from '../index';
import Sentry from '@sentry/node';

describe('index.ts', () => {
  it('serves /openapi.json (Swagger spec)', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body?.openapi).toBe('3.0.0');
  });

  it('captures unhandledRejection via Sentry', () => {
    const err = new Error('boom');
    process.emit('unhandledRejection' as any, err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
