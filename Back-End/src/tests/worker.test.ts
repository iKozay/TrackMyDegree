/* eslint-disable @typescript-eslint/no-explicit-any */

describe('worker.ts', () => {
  let mockSentryInit: jest.Mock;
  let mockSentryCaptureException: jest.Mock;
  let mockDotenvConfig: jest.Mock;
  let mockMongooseConnect: jest.Mock;
  let mockMongooseClose: jest.Mock;
  let mockConnectJobRedis: jest.Mock;
  let mockCourseProcessorWorkerClose: jest.Mock;

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  let registeredHandlers: Record<string, (...args: any[]) => any>;

  const importWorker = () => {
    jest.isolateModules(() => {
      require('../worker'); // adjust path if needed
    });
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    registeredHandlers = {};

    mockSentryInit = jest.fn();
    mockSentryCaptureException = jest.fn();

    mockDotenvConfig = jest.fn(() => ({}));

    mockMongooseConnect = jest.fn().mockResolvedValue(undefined);
    mockMongooseClose = jest.fn().mockResolvedValue(undefined);

    mockConnectJobRedis = jest.fn().mockResolvedValue(undefined);

    mockCourseProcessorWorkerClose = jest.fn().mockResolvedValue(undefined);

    jest.doMock('@sentry/node', () => ({
      __esModule: true,
      default: {},
      init: mockSentryInit,
      captureException: mockSentryCaptureException,
    }));

    jest.doMock('dotenv', () => ({
      __esModule: true,
      default: {
        config: mockDotenvConfig,
      },
    }));

    jest.doMock('mongoose', () => ({
      __esModule: true,
      default: {
        connect: mockMongooseConnect,
        connection: {
          close: mockMongooseClose,
        },
      },
    }));

    jest.doMock('@lib/redisClient', () => ({
      __esModule: true,
      connectJobRedis: mockConnectJobRedis,
    }));

    jest.doMock('../workers/queue', () => ({
      __esModule: true,
      courseProcessorWorker: {
        close: mockCourseProcessorWorkerClose,
      },
    }));

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => undefined) as never);

    jest.spyOn(process, 'on').mockImplementation(((
      event: string,
      handler: any,
    ) => {
      registeredHandlers[event] = handler;
      return process;
    }) as any);

    delete (process.env as any).NODE_ENV;
    delete (process.env as any).MONGODB_URI;
    delete (process.env as any).SENTRY_DSN;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('initializes Sentry on import', async () => {
    importWorker();

    await Promise.resolve();

    expect(mockSentryInit).toHaveBeenCalledWith({
      dsn: undefined,
      tracesSampleRate: 1,
    });
  });

  it('loads dotenv in development mode and logs success', async () => {
    process.env.NODE_ENV = 'development';

    importWorker();
    await Promise.resolve();

    expect(mockDotenvConfig).toHaveBeenCalledTimes(1);
    expect(mockDotenvConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('secrets'),
        debug: true,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Environment variables loaded successfully',
    );
  });

  it('throws when dotenv fails in development mode', () => {
    process.env.NODE_ENV = 'development';

    const envError = new Error('dotenv failed');
    mockDotenvConfig.mockReturnValue({ error: envError });

    expect(() => importWorker()).toThrow(envError);

    expect(errorSpy).toHaveBeenCalledWith('Error loading .env file:', envError);
  });

  it('connects to MongoDB and Redis successfully on start', async () => {
    process.env.MONGODB_URI = 'mongodb://custom-uri:27017/testdb';

    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMongooseConnect).toHaveBeenCalledWith(
      'mongodb://custom-uri:27017/testdb',
    );
    expect(mockConnectJobRedis).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Worker connected to MongoDB');
    expect(logSpy).toHaveBeenCalledWith(
      'Worker started and listening for jobs...',
    );
  });

  it('uses default MongoDB URI when env var is missing', async () => {
    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockMongooseConnect).toHaveBeenCalledWith(
      'mongodb://admin:changeme123@localhost:27017/trackmydegree',
    );
  });

  it('captures exception and exits when start fails during MongoDB connection', async () => {
    const err = new Error('mongo failed');
    mockMongooseConnect.mockRejectedValue(err);

    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith('Failed to start worker:', err);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('captures exception and exits when start fails during Redis connection', async () => {
    const err = new Error('redis failed');
    mockConnectJobRedis.mockRejectedValue(err);

    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    expect(errorSpy).toHaveBeenCalledWith('Failed to start worker:', err);
    expect(mockSentryCaptureException).toHaveBeenCalledWith(err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('registers SIGTERM, SIGINT, and unhandledRejection handlers', async () => {
    importWorker();
    await Promise.resolve();

    expect(registeredHandlers.SIGTERM).toBeDefined();
    expect(registeredHandlers.SIGINT).toBeDefined();
    expect(registeredHandlers.unhandledRejection).toBeDefined();
  });

  it('gracefully shuts down on SIGTERM', async () => {
    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    await registeredHandlers.SIGTERM();

    expect(logSpy).toHaveBeenCalledWith('Shutting down worker...');
    expect(mockCourseProcessorWorkerClose).toHaveBeenCalledTimes(1);
    expect(mockMongooseClose).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Worker shut down gracefully');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('gracefully shuts down on SIGINT', async () => {
    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    await registeredHandlers.SIGINT();

    expect(logSpy).toHaveBeenCalledWith('Shutting down worker...');
    expect(mockCourseProcessorWorkerClose).toHaveBeenCalledTimes(1);
    expect(mockMongooseClose).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Worker shut down gracefully');
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits with code 1 if shutdown fails while closing worker', async () => {
    const err = new Error('worker close failed');
    mockCourseProcessorWorkerClose.mockRejectedValue(err);

    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    await registeredHandlers.SIGTERM();

    expect(errorSpy).toHaveBeenCalledWith('Error during shutdown:', err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits with code 1 if shutdown fails while closing mongoose connection', async () => {
    const err = new Error('mongoose close failed');
    mockMongooseClose.mockRejectedValue(err);

    importWorker();
    await Promise.resolve();
    await Promise.resolve();

    await registeredHandlers.SIGTERM();

    expect(mockCourseProcessorWorkerClose).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Error during shutdown:', err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('captures unhandled promise rejections with Sentry', async () => {
    const reason = new Error('unhandled rejection');

    importWorker();
    await Promise.resolve();

    registeredHandlers.unhandledRejection(reason);

    expect(mockSentryCaptureException).toHaveBeenCalledWith(reason);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection in worker:',
      reason,
    );
  });

  it('handles non-Error unhandled rejection reasons', async () => {
    const reason = 'plain string rejection';

    importWorker();
    await Promise.resolve();

    registeredHandlers.unhandledRejection(reason);

    expect(mockSentryCaptureException).toHaveBeenCalledWith(reason);
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled Rejection in worker:',
      reason,
    );
  });
});
