process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

const express = require('express');
const supertest = require('supertest');
const cookieParser = require('cookie-parser');
const { authMiddleware, userCheckMiddleware, adminCheckMiddleware } = require('../../middleware/authMiddleware');
const { errorHandler } = require('../../middleware/errorHandler');
const { jwtService } = require('../../services/jwtService');
const { authController } = require('../../controllers/authController');
const { ForbiddenError } = require('../../utils/errors');

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

const app = express();
app.use(express.json());
app.use(cookieParser());

// Dummy routes for testing middleware
app.get('/test-auth', authMiddleware, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

app.get('/test-admin', authMiddleware, adminCheckMiddleware, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// Global error handler
app.use(errorHandler);

const request = supertest(app);

describe('authMiddleware, userCheckMiddleware & adminCheckMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Auth middleware tests ---
  describe('authMiddleware', () => {
    test('should return 401 when access token is missing', async () => {
      const res = await request.get('/test-auth');
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: 'UnauthorizedError',
        message: 'Missing access token',
        status: 401,
      });
    });

    test('should return 401 when token is invalid', async () => {
      jwtService.verifyAccessToken.mockReturnValue(null);

      const res = await request.get('/test-auth').set('Cookie', ['access_token=invalid-token']);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: 'UnauthorizedError',
        message: 'Invalid or expired token',
        status: 401,
      });
    });

    test('should call next when authentication is successful', async () => {
      const mockPayload = { userId: 'user123' };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);

      const res = await request.get('/test-auth').set('Cookie', ['access_token=valid-token']);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, user: mockPayload });
    });
  });

  describe('userCheckMiddleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      params: {},
      user: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test('should call next with ForbiddenError when userId does not match', async () => {
    req.params = { userId: 'user-params' };
    req.user = { userId: 'user-jwt' };

    await userCheckMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  test('should call next when JWT user id matches params userId', async () => {
    req.params = { userId: 'user-123' };
    req.user = { userId: 'user-123' };

    await userCheckMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(); // or just expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled();
  });
});

  describe('adminCheckMiddleware', () => {
    test('should return 403 when user is not admin', async () => {
      const mockPayload = { userId: 'user123' };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);
      authController.isAdmin.mockResolvedValue(false);

      const res = await request.get('/test-admin').set('Cookie', ['access_token=valid-token']);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        success: false,
        error: 'ForbiddenError',
        message: 'Admins only',
        status: 403,
      });
    });

    test('should call next when user is admin', async () => {
      const mockPayload = { userId: 'admin123' };
      jwtService.verifyAccessToken.mockReturnValue(mockPayload);
      authController.isAdmin.mockResolvedValue(true);

      const res = await request.get('/test-admin').set('Cookie', ['access_token=valid-token']);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, user: mockPayload });
    });

    test('should return 401 when authentication fails in adminCheck', async () => {
      jwtService.verifyAccessToken.mockReturnValue(null);

      const res = await request.get('/test-admin').set('Cookie', ['access_token=invalid-token']);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: 'UnauthorizedError',
        message: 'Invalid or expired token',
        status: 401,
      });
      expect(authController.isAdmin).not.toHaveBeenCalled();
    });
  });
});