/**
 * Covers:
 *  - successful connection path (logs + returns pool)
 *  - failed connection path (Sentry.captureException + returns undefined)
 *  - password-from-file branch executed at module load time
 */

const REAL_ENV = process.env;

const mockConnect = jest.fn();
jest.mock('mssql', () => ({ connect: (...args: any[]) => (global as any).__mssql_connect__(...args) }));
jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

// Provide requiredEnv so module can build sqlConfig without real envs
jest.mock('@Util/requiredEnv', () => ({
  requiredEnv: (k: string) => `dummy_${k}`,
}));

// Minimal fs mock for the password-file branch test
const readFileSync = jest.fn();
jest.mock('fs', () => ({ readFileSync: (...args: any[]) => (global as any).__fs_readFileSync__(...args) }));

// Helper to (re)load the module under different env conditions
const loadModule = async () => {
  jest.resetModules();
  // rewire globals used by the mocks
  (global as any).__mssql_connect__ = mockConnect;
  (global as any).__fs_readFileSync__ = readFileSync;
  return await import('../controllers/DBController/DBController');
};

describe('DBController.getConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...REAL_ENV };
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
    // Trigger the password-from-file path in the top-level code
    process.env.SQL_SERVER_PASSWORD_FILE = '/run/secrets/sql_pwd';
    readFileSync.mockReturnValueOnce('supersecret\n');

    // connect can resolve; we just want to hit the branch
    mockConnect.mockResolvedValueOnce({ ok: true });

    const mod = await loadModule();
    await mod.default.getConnection();

    // proves our fs mock was exercised
    expect(readFileSync).toHaveBeenCalledWith('/run/secrets/sql_pwd', 'utf-8');
  });
});
