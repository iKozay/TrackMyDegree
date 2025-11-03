/**
 * Test file for Back-End/index.ts
 */

const mongoose = require('mongoose');

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
  return express;
});

jest.mock('cors');
jest.mock('cookie-parser');
jest.mock('dotenv');

// Mock all routes
jest.mock('../dist/routes/auth', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/courses', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/exemption', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/deficiency', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/degree', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/timeline', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/coursepool', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/userData', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/adminRoutes', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/requisite', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/feedback', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/session', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/sectionsRoutes', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/upload', () => ({ default: jest.fn() }));
jest.mock('../dist/routes/mongo', () => ({ default: jest.fn() }));

jest.mock('../dist/controllers/DBController/DBController', () => ({
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

jest.mock('../dist/middleware/rateLimiter', () => ({
  forgotPasswordLimiter: jest.fn(),
  resetPasswordLimiter: jest.fn(),
  loginLimiter: jest.fn(),
  signupLimiter: jest.fn(),
}));

jest.mock('../dist/middleware/errorHandler', () => ({
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
      require('../dist/index.js');
    }).not.toThrow();
  });

  it('should handle environment variables', () => {
    process.env.PORT = '3000';
    process.env.CLIENT = 'http://test:4000';
    
    expect(() => {
      require('../dist/index.js');
    }).not.toThrow();
  });

  it('should use default values when env vars are not set', () => {
    delete process.env.PORT;
    delete process.env.CLIENT;
    
    expect(() => {
      require('../dist/index.js');
    }).not.toThrow();
  });

  it('should set up unhandled rejection handler', () => {
    const Sentry = require('@sentry/node');
    
    // Simulate unhandled rejection
    process.emit('unhandledRejection', new Error('Test rejection'));
    
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('should setup express app with all middleware', () => {
    const express = require('express');
    const cors = require('cors');
    const cookieParser = require('cookie-parser');

    require('../dist/index.js');

    const app = express.mock.results[0].value;

    // Verify middleware setup
    expect(app.use).toHaveBeenCalled();
    expect(app.options).toHaveBeenCalledWith('*', expect.any(Function));
    expect(app.get).toHaveBeenCalledWith('/test-db', expect.any(Function));
    expect(app.listen).toHaveBeenCalled();
  });

  it('should setup all routes', () => {
    const express = require('express');
    require('../dist/index.js');

    const app = express.mock.results[0].value;

    // Verify all routes are registered
    expect(app.use).toHaveBeenCalledWith('/auth', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/courses', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/degree', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/exemption', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/deficiency', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/timeline', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/coursepool', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/data', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/admin', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/requisite', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/feedback', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/session', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/section', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/upload', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/mongo', expect.any(Function));
  });

  it('should setup rate limiters', () => {
    const express = require('express');
    const rateLimiter = require('../dist/middleware/rateLimiter');

    require('../dist/index.js');

    const app = express.mock.results[0].value;

    // Verify rate limiters are applied
    expect(app.use).toHaveBeenCalledWith('/auth/forgot-password', rateLimiter.forgotPasswordLimiter);
    expect(app.use).toHaveBeenCalledWith('/auth/reset-password', rateLimiter.resetPasswordLimiter);
    expect(app.use).toHaveBeenCalledWith('/auth/login', rateLimiter.loginLimiter);
    expect(app.use).toHaveBeenCalledWith('/auth/signup', rateLimiter.signupLimiter);
  });

  it('should setup error handlers', () => {
    const express = require('express');
    const errorHandler = require('../dist/middleware/errorHandler');

    require('../dist/index.js');

    const app = express.mock.results[0].value;

    // Verify error handlers are applied
    expect(app.use).toHaveBeenCalledWith(errorHandler.notFoundHandler);
    expect(app.use).toHaveBeenCalledWith(errorHandler.errorHandler);
  });
});
