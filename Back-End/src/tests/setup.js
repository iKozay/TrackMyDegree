require('source-map-support/register');

// Make sure tests run in "test" env (optional but harmless)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Mock swagger-ui-express so it doesn't call express.static on import
jest.mock('swagger-ui-express', () => ({
  serve: [], // swaggerUi.serve is an array of middlewares
  setup: () => (_req, _res, next) => next(), // no-op middleware
}));
