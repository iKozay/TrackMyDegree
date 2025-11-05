// Mock all external dependencies
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  setupExpressErrorHandler: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('@sentry/profiling-node', () => ({
  nodeProfilingIntegration: jest.fn(),
}));

// Simplified CommonJS-style express mock
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn(),
    listen: jest.fn((port, cb) => cb && cb()),
    get: jest.fn(),
    options: jest.fn(),
  };

  const makeRouter = () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn(),
    patch: jest.fn(),
  });

  const express = () => mockApp;
  express.Router = jest.fn(makeRouter);
  express.urlencoded = jest.fn(() => jest.fn());
  express.json = jest.fn(() => jest.fn());
  return express;
});


jest.mock('cookie-parser', () => jest.fn());
jest.mock('dotenv', () => ({ config: jest.fn() }));

const createMockRouter = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
  patch: jest.fn(),
});

jest.mock('@routes/auth', () => createMockRouter());
jest.mock('@routes/courses', () => createMockRouter());
jest.mock('@routes/exemption', () => createMockRouter());
jest.mock('@routes/deficiency', () => createMockRouter());
jest.mock('@routes/degree', () => createMockRouter());
jest.mock('@routes/timeline', () => createMockRouter());
jest.mock('@routes/coursepool', () => createMockRouter());
jest.mock('@routes/userData', () => createMockRouter());
jest.mock('@routes/adminRoutes', () => createMockRouter());
jest.mock('@routes/requisite', () => createMockRouter());
jest.mock('@routes/feedback', () => createMockRouter());
jest.mock('@routes/session', () => createMockRouter());
jest.mock('@routes/sectionsRoutes', () => createMockRouter());
jest.mock('@routes/upload', () => createMockRouter());
jest.mock('@routes/mongo', () => createMockRouter());


jest.mock('@controllers/DBController/DBController', () => ({
  getConnection: jest.fn().mockResolvedValue({
    request: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({ recordset: [{ number: 1 }] }),
    }),
  }),
}));

jest.mock('@middleware/rateLimiter', () => ({
  forgotPasswordLimiter: jest.fn(),
  resetPasswordLimiter: jest.fn(),
  loginLimiter: jest.fn(),
  signupLimiter: jest.fn(),
}));

jest.mock('@middleware/errorHandler', () => ({
  notFoundHandler: jest.fn(),
  errorHandler: jest.fn(),
}));

jest.mock('../Util/HTTPCodes', () => ({
  OK: 200,
  SERVER_ERR: 500,
}));

describe('index.ts', () => {
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
    process.removeAllListeners('unhandledRejection');
  });

  it('should be importable', () => {
    expect(() => {
      require('../index.ts');
    }).not.toThrow();
  });

  it('should initialize Sentry with correct configuration', () => {
    require('../index.ts');

    const Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');

    expect(Sentry.init).toHaveBeenCalledWith({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1,
      profilesSampleRate: 1,
    });
  });

  it('should configure dotenv', () => {
    require('../index.ts');

    const dotenv = require('dotenv');
    expect(dotenv.config).toHaveBeenCalled();
  });

  it('should handle environment variables', () => {
    process.env.PORT = '3000';

    require('../index.ts');

    expect(consoleSpy).toHaveBeenCalledWith('Server listening on Port: 3000');
  });

  it('should use default values when env vars are not set', () => {
    delete process.env.PORT;

    require('../index.ts');

    expect(consoleSpy).toHaveBeenCalledWith('Server listening on Port: 8000');
  });

  it('should setup express app with all middleware', () => {
    require('../index.ts');

    const express = require('express');
    const cookieParser = require('cookie-parser');

    expect(express.urlencoded).toHaveBeenCalledWith({ extended: false });
    expect(express.json).toHaveBeenCalled();
    expect(cookieParser).toHaveBeenCalled();
  });

  it('should setup all routes', () => {
    require('../index.ts');

    const express = require('express');
    const app = express();

    expect(app.use).toHaveBeenCalledWith('/auth', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/courses', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/degree', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/exemption', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/deficiency', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/timeline', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/coursepool', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/data', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/admin', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/requisite', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/feedback', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/session', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/section', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/upload', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/v2', expect.anything());
  });

  it('should setup rate limiters', () => {
    require('../index.ts');

    const express = require('express');
    const rateLimiter = require('@middleware/rateLimiter');
    const app = express();

    expect(app.use).toHaveBeenCalledWith(
      '/auth/forgot-password',
      rateLimiter.forgotPasswordLimiter,
    );
    expect(app.use).toHaveBeenCalledWith(
      '/auth/reset-password',
      rateLimiter.resetPasswordLimiter,
    );
    expect(app.use).toHaveBeenCalledWith(
      '/auth/login',
      rateLimiter.loginLimiter,
    );
    expect(app.use).toHaveBeenCalledWith(
      '/auth/signup',
      rateLimiter.signupLimiter,
    );
  });

  it('should setup error handlers', () => {
    require('../index.ts');

    const express = require('express');
    const errorHandler = require('@middleware/errorHandler');
    const app = express();

    expect(app.use).toHaveBeenCalledWith(errorHandler.notFoundHandler);
    expect(app.use).toHaveBeenCalledWith(errorHandler.errorHandler);
  });

  it('should set up unhandled rejection handler', () => {
    require('../index.ts');

    const Sentry = require('@sentry/node');
    const testError = new Error('Test rejection');

    process.emit('unhandledRejection', testError);

    expect(Sentry.captureException).toHaveBeenCalledWith(testError);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection:',
      testError,
    );
  });
});
