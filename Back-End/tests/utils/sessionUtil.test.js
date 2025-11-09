process.env.SESSION_ALGO = 'aes-256-gcm';
process.env.JWT_SECRET = 'test-secret-key';

const {
  createSessionToken,
  verifySession,
  refreshSession,
} = require('../../utils/sessionUtil');

describe('sessionUtil', () => {
  const mockUserHeaders = {
    agent: 'Mozilla/5.0 (Test Browser)',
    ip_addr: '192.168.1.1',
  };

  beforeAll(() => {
    // Environment variables are already set above
  });

  afterAll(() => {
    delete process.env.SESSION_ALGO;
    delete process.env.JWT_SECRET;
  });

  describe('createSessionToken', () => {
    test('should create a session token with default salt', () => {
      const token = createSessionToken(mockUserHeaders);

      expect(token).toHaveProperty('key');
      expect(token).toHaveProperty('iv');
      expect(token).toHaveProperty('salt', 1);
      expect(typeof token.key).toBe('string');
      expect(typeof token.iv).toBe('string');
    });
  });

  describe('verifySession', () => {
    test('should return true when agent and ip_addr match', () => {
      const token = createSessionToken(mockUserHeaders);
      const result = verifySession(token, mockUserHeaders);
      expect(result).toBe(true);
    });

    test('should return false when agent does not match', () => {
      const token = createSessionToken(mockUserHeaders);
      const differentHeaders = {
        agent: 'Different Browser',
        ip_addr: '192.168.1.1',
      };
      const result = verifySession(token, differentHeaders);
      expect(result).toBe(false);
    });

    test('should return false when ip_addr does not match', () => {
      const token = createSessionToken(mockUserHeaders);
      const differentHeaders = {
        agent: 'Mozilla/5.0 (Test Browser)',
        ip_addr: '10.0.0.1',
      };
      const result = verifySession(token, differentHeaders);
      expect(result).toBe(false);
    });
  });

  describe('refreshSession', () => {
    test('should return new token for valid session', () => {
      const originalToken = createSessionToken(mockUserHeaders, 5);
      const refreshedToken = refreshSession(originalToken, mockUserHeaders);

      expect(refreshedToken).not.toBeNull();
      expect(refreshedToken.salt).toBe(7); // 5 + 1 + 1
      expect(refreshedToken).toHaveProperty('key');
      expect(refreshedToken).toHaveProperty('iv');
    });
  });
});
