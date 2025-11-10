process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

const {
  authMiddleware,
  adminCheckMiddleware,
} = require('../../middleware/authMiddleware');

// Mock dependencies
jest.mock('../../services/jwtService', () => ({
  jwtService: {
    verifyAccessToken: jest.fn(),
  },
}));

jest.mock('../../controllers/authController', () => ({
  authController: {
    isAdmin: jest.fn(),
  },
}));

const { jwtService } = require('../../services/jwtService');
const { authController } = require('../../controllers/authController');

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    test('should return 401 when access token is missing', async () => {
      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing access token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token is invalid', async () => {
      req.cookies.access_token = 'invalid-token';
      jwtService.verifyAccessToken.mockReturnValue(null);

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next when authentication is successful', async () => {
      req.cookies.access_token = 'valid-token';
      const mockPayload = {
        userId: 'user123',
      };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);

      await authMiddleware(req, res, next);

      expect(req.user).toEqual(mockPayload);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('adminCheckMiddleware', () => {
    test('should return 403 when user is not admin', async () => {
      req.cookies.access_token = 'valid-token';
      const mockPayload = { userId: 'user123' };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);
      authController.isAdmin.mockResolvedValue(false);

      await adminCheckMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admins only' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next when user is admin', async () => {
      req.cookies.access_token = 'valid-token';
      const mockPayload = { userId: 'admin123' };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);
      authController.isAdmin.mockResolvedValue(true);

      await adminCheckMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });

    test('should return 401 when authentication fails in adminCheck', async () => {
      req.cookies.access_token = 'invalid-token';
      jwtService.verifyAccessToken.mockReturnValue(null);

      await adminCheckMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(authController.isAdmin).not.toHaveBeenCalled();
    });
  });
});
