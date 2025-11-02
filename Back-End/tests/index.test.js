/**
 * Test file for Back-End/index.ts
 */

describe('index.ts', () => {
  let consoleSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set up mocks inside beforeEach to ensure they persist after resetModules
    jest.mock('@sentry/node', () => ({
      init: jest.fn(),
      setupExpressErrorHandler: jest.fn(),
      captureException: jest.fn(),
    }));

    jest.mock('@sentry/profiling-node', () => ({
      nodeProfilingIntegration: jest.fn(),
    }));

    jest.mock('express', () => {
      const express = jest.fn(() => ({
        use: jest.fn(),
        listen: jest.fn((port, callback) => callback()),
        get: jest.fn(),
      }));
      express.urlencoded = jest.fn();
      express.json = jest.fn();
      return express;
    });

    jest.mock('cookie-parser', () => jest.fn());
    jest.mock('dotenv', () => ({ config: jest.fn() }));

// Mock all routes (use alias paths to match index.ts imports)
jest.mock('@routes/auth', () => ({ default: jest.fn() }));
jest.mock('@routes/courses', () => ({ default: jest.fn() }));
jest.mock('@routes/exemption', () => ({ default: jest.fn() }));
jest.mock('@routes/deficiency', () => ({ default: jest.fn() }));
jest.mock('@routes/degree', () => ({ default: jest.fn() }));
jest.mock('@routes/timeline', () => ({ default: jest.fn() }));
jest.mock('@routes/coursepool', () => ({ default: jest.fn() }));
jest.mock('@routes/userData', () => ({ default: jest.fn() }));
jest.mock('@routes/adminRoutes', () => ({ default: jest.fn() }));
jest.mock('@routes/requisite', () => ({ default: jest.fn() }));
jest.mock('@routes/feedback', () => ({ default: jest.fn() }));
jest.mock('@routes/session', () => ({ default: jest.fn() }));
jest.mock('@routes/sectionsRoutes', () => ({ default: jest.fn() }));
jest.mock('@routes/transcript', () => ({ default: jest.fn() }));
jest.mock('@routes/mongo', () => ({ default: jest.fn() }));

    jest.doMock('@controllers/DBController/DBController', () => ({
      default: {
        getConnection: jest.fn().mockResolvedValue({
          request: jest.fn().mockReturnValue({
            query: jest.fn().mockResolvedValue({
              recordset: [{ number: 1 }],
            }),
          }),
        }),
      },
    }));

    jest.doMock('@middleware/rateLimiter', () => ({
      forgotPasswordLimiter: jest.fn(),
      resetPasswordLimiter: jest.fn(),
      loginLimiter: jest.fn(),
      signupLimiter: jest.fn(),
    }));

    jest.doMock('@middleware/errorHandler', () => ({
      notFoundHandler: jest.fn(),
      errorHandler: jest.fn(),
    }));

    jest.doMock('../dist/Util/HTTPCodes', () => ({
      OK: 200,
      SERVER_ERR: 500,
    }));

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Clean up spies
    consoleSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();

    // Clear any event listeners that might have been added
    process.removeAllListeners('unhandledRejection');

    // Reset all mocks
    jest.resetAllMocks();
  });

  it('should be importable', () => {
    expect(() => {
      require('../index.ts');
    }).not.toThrow();
  });

  it('should initialize Sentry with correct configuration', () => {
    require('../dist/index.js');

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
    require('../dist/index.js');

    const dotenv = require('dotenv');
    expect(dotenv.config).toHaveBeenCalled();
  });

  it('should handle environment variables', () => {
    process.env.PORT = '3000';

    expect(() => {
      require('../index.ts');
    }).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith('Server listening on Port: 3000');
  });

  it('should use default port when PORT is not set', () => {
    delete process.env.PORT;

    require('../index.ts');

    expect(consoleSpy).toHaveBeenCalledWith('Server listening on Port: 8000');
  });

  it('should setup express app with middleware', () => {
    require('../dist/index.js');

    const express = require('express');
    const cookieParser = require('cookie-parser');

    require('../index.ts');

    const app = express.mock.results[0].value;

    expect(express.urlencoded).toHaveBeenCalledWith({ extended: false });
    expect(express.json).toHaveBeenCalled();
    expect(cookieParser).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalled();
  });

  it('should setup all routes correctly', () => {
    require('../index.ts');

    const express = require('express');
    const app = express.mock.results[0].value;

    // Verify all routes are registered
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
    expect(app.use).toHaveBeenCalledWith('/transcript', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/v2', expect.anything());
  });

  it('should setup rate limiters', () => {
    require('../dist/index.js');

    const express = require('express');
    const rateLimiter = require('../middleware/rateLimiter');

    require('../index.ts');

    const app = express.mock.results[0].value;

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
    require('../dist/index.js');

    const express = require('express');
    const errorHandler = require('../middleware/errorHandler');

    require('../index.ts');

    const app = express.mock.results[0].value;

    expect(app.use).toHaveBeenCalledWith(errorHandler.notFoundHandler);
    expect(app.use).toHaveBeenCalledWith(errorHandler.errorHandler);
  });

  it('should setup test-db route', () => {
    require('../dist/index.js');

    const express = require('express');
    const app = express.mock.results[0].value;

    expect(app.get).toHaveBeenCalledWith('/test-db', expect.any(Function));
  });

  it('should setup Sentry error handler', () => {
    require('../dist/index.js');

    const Sentry = require('@sentry/node');
    const express = require('express');
    const app = express.mock.results[0].value;

    expect(Sentry.setupExpressErrorHandler).toHaveBeenCalledWith(app);
  });

  it('should set up unhandled rejection handler', () => {
    require('../dist/index.js');

    const Sentry = require('@sentry/node');

    // Simulate unhandled rejection
    const testError = new Error('Test rejection');
    process.emit('unhandledRejection', testError);

    expect(Sentry.captureException).toHaveBeenCalledWith(testError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled Rejection:', testError);
  });

  it('should start server on specified port', () => {
    require('../dist/index.js');

    const express = require('express');
    const app = express.mock.results[0].value;

    expect(app.listen).toHaveBeenCalled();
  });
});
