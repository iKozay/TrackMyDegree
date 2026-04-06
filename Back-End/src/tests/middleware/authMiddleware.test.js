process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

import express, { Request, Response } from 'express';
import supertest from 'supertest';
import cookieParser from 'cookie-parser';
import { authMiddleware, adminCheckMiddleware } from '../../middleware/authMiddleware';
import { errorHandler } from '../../middleware/errorHandler';
import { jwtService } from '../../services/jwtService';
import { authController } from '../../controllers/authController';

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

describe('authMiddleware & adminCheckMiddleware', () => {
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

  // --- Admin middleware tests ---
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