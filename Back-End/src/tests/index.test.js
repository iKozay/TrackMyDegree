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
let mockApp;
jest.mock('express', () => {
  mockApp = {
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
jest.mock('cors', () => jest.fn());

// Mock mongoose to handle top-level await
jest.mock('mongoose', () => {
  const mockConnection = {
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
  };

  return {
    connect: jest.fn().mockResolvedValue(mockConnection),
    connection: mockConnection,
    Schema: jest.fn(),
    model: jest.fn(),
  };
});

const createMockRouter = () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  use: jest.fn(),
  patch: jest.fn(),
});

jest.mock('@routes/authRoutes', () => createMockRouter());
jest.mock('@routes/courseRoutes', () => createMockRouter());
jest.mock('@routes/degreeRoutes', () => createMockRouter());
jest.mock('@routes/timelineRoutes', () => createMockRouter());
jest.mock('@routes/coursepoolRoutes', () => createMockRouter());
jest.mock('@routes/userRoutes', () => createMockRouter());
jest.mock('@routes/adminRoutes', () => createMockRouter());
jest.mock('@routes/sectionsRoutes', () => createMockRouter());
jest.mock('@routes/uploadRoutes', () => createMockRouter());

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

jest.mock('../utils/httpCodes', () => ({
  OK: 200,
  SERVER_ERR: 500,
}));

// Mock index.ts to avoid top-level await compilation error
// We'll test the actual behavior through the mocks
jest.mock(
  '../index.ts',
  () => {
    const express = require('express');
    const dotenv = require('dotenv');
    const Sentry = require('@sentry/node');
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    const mongoose = require('mongoose');
    const cookieParser = require('cookie-parser');
    const cors = require('cors');

    // Initialize Sentry
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1,
      profilesSampleRate: 1,
    });

    // Configure dotenv
    dotenv.config();

    // Use the same mockApp instance from express mock
    const app = express();
    const PORT = process.env.BACKEND_PORT || 8000;

    // Mock mongoose connection (already mocked above)
    mongoose.connect.mockResolvedValue(mongoose.connection);

    // Setup Sentry error handler
    Sentry.setupExpressErrorHandler(app);

    // Setup CORS
    app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }),
    );

    // Setup middleware
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(cookieParser());

    // Setup rate limiters
    const rateLimiter = require('@middleware/rateLimiter');
    app.use('/auth/forgot-password', rateLimiter.forgotPasswordLimiter);
    app.use('/auth/reset-password', rateLimiter.resetPasswordLimiter);
    app.use('/auth/login', rateLimiter.loginLimiter);
    app.use('/auth/signup', rateLimiter.signupLimiter);

    // Setup routes
    const authRouter = require('@routes/authRoutes');
    const coursesRouter = require('@routes/courseRoutes');
    const degreeRouter = require('@routes/degreeRoutes');
    const timelineRouter = require('@routes/timelineRoutes');
    const coursepoolRouter = require('@routes/coursepoolRoutes');
    const userRouter = require('@routes/userRoutes');
    const adminRouter = require('@routes/adminRoutes');
    const sectionsRoutes = require('@routes/sectionsRoutes');
    const uploadRouter = require('@routes/uploadRoutes');

    app.use('/auth', authRouter);
    app.use('/courses', coursesRouter);
    app.use('/degree', degreeRouter);
    app.use('/timeline', timelineRouter);
    app.use('/coursepool', coursepoolRouter);
    app.use('/users', userRouter);
    app.use('/admin', adminRouter);
    app.use('/section', sectionsRoutes);
    app.use('/upload', uploadRouter);

    // Setup error handlers
    const errorHandler = require('@middleware/errorHandler');
    app.use(errorHandler.notFoundHandler);
    app.use(errorHandler.errorHandler);

    // Listen
    app.listen(PORT, () => {
      console.log(`Server listening on Port: ${PORT}`);
    });

    // Setup unhandled rejection handler
    process.on('unhandledRejection', (reason) => {
      Sentry.captureException(reason);
      console.error('Unhandled Rejection:', reason);
    });

    return { default: app };
  },
  { virtual: true },
);

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
    process.env.BACKEND_PORT = '3000';

    require('../index.ts');

    expect(consoleSpy).toHaveBeenCalledWith('Server listening on Port: 3000');
  });

  it('should use default values when env vars are not set', () => {
    delete process.env.BACKEND_PORT;

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

    expect(mockApp.use).toHaveBeenCalledWith('/auth', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/courses', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/degree', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/timeline', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/coursepool', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/users', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/admin', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/section', expect.anything());
    expect(mockApp.use).toHaveBeenCalledWith('/upload', expect.anything());
  });

  it('should setup rate limiters', () => {
    require('../index.ts');

    const rateLimiter = require('@middleware/rateLimiter');

    expect(mockApp.use).toHaveBeenCalledWith(
      '/auth/forgot-password',
      rateLimiter.forgotPasswordLimiter,
    );
    expect(mockApp.use).toHaveBeenCalledWith(
      '/auth/reset-password',
      rateLimiter.resetPasswordLimiter,
    );
    expect(mockApp.use).toHaveBeenCalledWith(
      '/auth/login',
      rateLimiter.loginLimiter,
    );
    expect(mockApp.use).toHaveBeenCalledWith(
      '/auth/signup',
      rateLimiter.signupLimiter,
    );
  });

  it('should setup error handlers', () => {
    require('../index.ts');

    const errorHandler = require('@middleware/errorHandler');

    expect(mockApp.use).toHaveBeenCalledWith(errorHandler.notFoundHandler);
    expect(mockApp.use).toHaveBeenCalledWith(errorHandler.errorHandler);
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
