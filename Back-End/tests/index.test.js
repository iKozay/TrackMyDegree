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
jest.mock('../dist/routes/transcript', () => ({ default: jest.fn() }));
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
});
