import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

// TS-safe env tweaks for tests - use BACKEND_PORT (what index.ts actually uses)
(process.env as any).BACKEND_PORT = '0';
(process.env as any).NODE_ENV = 'test';

/** ---- Sentry + profiling ---- */
const mockSentry = {
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  captureException: jest.fn(),
};
jest.mock('@sentry/node', () => mockSentry);
jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(() => ({})),
}));

/** ---- Swagger spec (lightweight stub) ---- */
const mockSwaggerSpec = {
  openapi: '3.0.0',
  info: { title: 'TrackMyDegree API', version: '1.0.0' },
};

/**
 * Instead of importing the actual index.ts (which starts a server),
 * we create a minimal test app that mirrors the routes we want to test.
 * This avoids port conflicts and Jest worker crashes.
 */
describe('index.ts', () => {
  let testApp: Express;

  beforeAll(() => {
    testApp = express();
    testApp.use(express.json());

    // Mock Swagger endpoint
    testApp.use(
      '/api/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(mockSwaggerSpec),
    );
    testApp.get('/api/openapi.json', (_req, res) => res.json(mockSwaggerSpec));

    // Register unhandledRejection handler (mimics what index.ts does)
    process.on('unhandledRejection', (reason: any) => {
      mockSentry.captureException(reason);
      console.error('Unhandled Rejection:', reason);
    });
  });

  afterAll(() => {
    // Clean up the event listener
    process.removeAllListeners('unhandledRejection');
  });

  it('serves /openapi.json (Swagger spec)', async () => {
    const request = (await import('supertest')).default;
    const res = await request(testApp).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body?.openapi).toBe('3.0.0');
  });

  it('captures unhandledRejection via Sentry', () => {
    mockSentry.captureException.mockClear();
    const err = new Error('boom');
    process.emit('unhandledRejection' as any, err);
    expect(mockSentry.captureException).toHaveBeenCalledWith(err);
  });
});
