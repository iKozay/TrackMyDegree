// Back-End/tests/requiredEnv.test.ts
import { requiredEnv } from '@utils/requiredEnv';

const REAL_ENV = process.env;

describe('requiredEnv', () => {
  beforeEach(() => {
    process.env = { ...REAL_ENV };
  });
  afterAll(() => {
    process.env = REAL_ENV;
  });

  describe('single variable', () => {
    test('throws when missing', () => {
      delete process.env.MY_VAR;
      expect(() => requiredEnv(['MY_VAR'])).toThrow(/MY_VAR/i);
    });

    test('returns object when present', () => {
      process.env.MY_VAR = 'abc';
      expect(requiredEnv(['MY_VAR'])).toEqual({ MY_VAR: 'abc' });
    });

    test('throws when value is empty string', () => {
      process.env.MY_VAR = '';
      expect(() => requiredEnv(['MY_VAR'])).toThrow(/MY_VAR/i);
    });
  });

  describe('multiple variables', () => {
    test('throws when one is missing', () => {
      process.env.VAR1 = 'value1';
      delete process.env.VAR2;
      expect(() => requiredEnv(['VAR1', 'VAR2'])).toThrow(/VAR2/i);
    });

    test('throws when multiple are missing', () => {
      delete process.env.VAR1;
      delete process.env.VAR2;
      expect(() => requiredEnv(['VAR1', 'VAR2'])).toThrow(/VAR1.*VAR2/i);
    });

    test('throws when one is empty string', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = '';
      expect(() => requiredEnv(['VAR1', 'VAR2'])).toThrow(/VAR2/i);
    });

    test('returns object when all present and non-empty', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const result = requiredEnv(['VAR1', 'VAR2']);
      expect(result).toEqual({ VAR1: 'value1', VAR2: 'value2' });
    });

    test('works with empty array', () => {
      expect(requiredEnv([])).toEqual({});
    });
  });
});
