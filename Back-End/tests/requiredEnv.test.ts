// Adjust import if your export shape differs
import { requiredEnv } from '../Util/requiredEnv';

const REAL_ENV = process.env;

describe('requiredEnv', () => {
  beforeEach(() => { process.env = { ...REAL_ENV }; });
  afterAll(() => { process.env = REAL_ENV; });

  test('throws when missing', () => {
    delete process.env.MY_VAR;
    expect(() => requiredEnv('MY_VAR')).toThrow(/MY_VAR/i);
  });

  test('returns value when present', () => {
    process.env.MY_VAR = 'abc';
    expect(requiredEnv('MY_VAR')).toBe('abc');
  });
});
