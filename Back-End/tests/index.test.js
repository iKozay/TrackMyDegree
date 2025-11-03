// Mock all external dependencies
jest.mock('@sentry/node', () => ({
  setupExpressErrorHandler: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('express', () => {
  const express = jest.fn(() => ({
    use: jest.fn(),
    listen: jest.fn(),
    get: jest.fn(),
    options: jest.fn(),
  }));
  // Provide middleware factory functions used by index.ts
  express.json = jest.fn(() => jest.fn());
  express.urlencoded = jest.fn(() => jest.fn());
  return express;
});

jest.mock('cors', () => jest.fn(() => jest.fn()));
jest.mock('cookie-parser');
jest.mock('dotenv');

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
jest.mock('@routes/upload', () => ({ default: jest.fn() }));
jest.mock('@routes/mongo', () => ({ default: jest.fn() }));

jest.mock('@controllers/DBController/DBController', () => ({
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

describe('index.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should be importable', () => {
    expect(() => {
      require('../index.ts');
    }).not.toThrow();
  });

  it('should handle environment variables', () => {
    process.env.PORT = '3000';
    process.env.CLIENT = 'http://test:4000';

    expect(() => {
      require('../index.ts');
    }).not.toThrow();
  });

  it('should use default values when env vars are not set', () => {
    delete process.env.PORT;
    delete process.env.CLIENT;

    expect(() => {
      require('../index.ts');
    }).not.toThrow();
  });

  it('should set up unhandled rejection handler', () => {
    const Sentry = require('@sentry/node');
    require('../index.ts');

    // Simulate unhandled rejection
    process.emit('unhandledRejection', new Error('Test rejection'));

    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('should setup express app with all middleware', () => {
    const express = require('express');
    const cors = require('cors');
    const cookieParser = require('cookie-parser');

    require('../index.ts');

    const app = express.mock.results[0].value;

    // Verify middleware setup
    expect(app.use).toHaveBeenCalled();
    expect(app.options).toHaveBeenCalledWith('*', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/test-db', expect.any(Function));
    expect(app.listen).toHaveBeenCalled();
  });

  it('should setup all routes', () => {
    const express = require('express');
    require('../index.ts');

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
    expect(app.use).toHaveBeenCalledWith('/upload', expect.anything());
    expect(app.use).toHaveBeenCalledWith('/v2', expect.anything());
  });

  it('should setup rate limiters', () => {
    const express = require('express');
    const rateLimiter = require('../middleware/rateLimiter');

    require('../index.ts');

    const app = express.mock.results[0].value;

    // Verify rate limiters are applied
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
    const express = require('express');
    const errorHandler = require('../middleware/errorHandler');

    require('../index.ts');

    const app = express.mock.results[0].value;

    // Verify error handlers are applied
    expect(app.use).toHaveBeenCalledWith(errorHandler.notFoundHandler);
    expect(app.use).toHaveBeenCalledWith(errorHandler.errorHandler);
  });
});
