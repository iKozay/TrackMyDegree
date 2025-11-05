/**
 * Covers:
 *  - successful connection path (returns pool)
 *  - failed connection path (Sentry.captureException + undefined)
 *  - password-from-file branch at module load
 */

const REAL_ENV = process.env;

const mockConnect = jest.fn();
jest.mock('mssql', () => ({
  connect: (...args: any[]) => (global as any).__mssql_connect__(...args),
}));
jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

// Minimal fs mock for the password-file branch test
const readFileSync = jest.fn();
jest.mock('fs', () => ({
  readFileSync: (...args: any[]) => (global as any).__fs_readFileSync__(...args),
}));

// IMPORTANT: do NOT mock @Util/requiredEnv — we will satisfy it via env vars

// helper to (re)load the module under controlled env/mocks
const loadModule = async () => {
  jest.resetModules();
  (global as any).__mssql_connect__ = mockConnect;
  (global as any).__fs_readFileSync__ = readFileSync;
  return await import('../controllers/DBController/DBController');
};

describe('DBController.getConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any previous values
    process.env.SQL_SERVER_USER = 'u';
    process.env.SQL_SERVER_PASSWORD = 'p';
    process.env.SQL_SERVER_DATABASE = 'db';
    process.env.SQL_SERVER_HOST = 'localhost';

    // If these exist in your real env and could interfere, clear them:
    delete process.env.SQL_SERVER_PASSWORD_FILE;

    });

  afterAll(() => {
    process.env = REAL_ENV;
  });

  test('returns pool when mssql.connect resolves', async () => {
    const fakePool = { ok: true };
    mockConnect.mockResolvedValueOnce(fakePool);

    const mod = await loadModule();
    const pool = await mod.default.getConnection();

    expect(pool).toBe(fakePool);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  test('captures exception and returns undefined when mssql.connect rejects', async () => {
    const boom = new Error('boom');
    mockConnect.mockRejectedValueOnce(boom);

    const mod = await loadModule();
    const pool = await mod.default.getConnection();

    expect(pool).toBeUndefined();
    const Sentry = await import('@sentry/node');
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  test('reads SQL_SERVER_PASSWORD_FILE at module load (no throw)', async () => {
    // Trigger the top-level password-file branch
    process.env.SQL_SERVER_PASSWORD_FILE = '/run/secrets/sql_pwd';
    readFileSync.mockReturnValueOnce('supersecret\n');

    mockConnect.mockResolvedValueOnce({ ok: true });

    const mod = await loadModule();
    await mod.default.getConnection();

    expect(readFileSync).toHaveBeenCalledWith('/run/secrets/sql_pwd', 'utf-8');
  });
});
