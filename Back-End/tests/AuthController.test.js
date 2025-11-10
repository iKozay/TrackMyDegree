/**
 * Integration-style Jest tests for AuthController.
 * Uses MongoMemoryServer for isolated DB
 * Mocks Redis + Nodemailer to avoid external dependencies
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { AuthController, UserType } from '../controllers/mondoDBControllers/AuthController';
import { User } from '../models/User';

// ─────────────────────────────────────────────
// Mock Nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// ─────────────────────────────────────────────
// Mock ioredis
const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
    del: mockRedisDel,
  }));
});

// ─────────────────────────────────────────────
// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

// ─────────────────────────────────────────────
// Setup
let mongoServer;
let authController;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  authController = new AuthController();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

// ─────────────────────────────────────────────
// Tests
describe('AuthController', () => {
  describe('registerUser', () => {
    it('should register new user', async () => {
      const res = await authController.registerUser({
        email: 'test@example.com',
        password: 'Pass123!',
        fullname: 'Test User',
        type: UserType.STUDENT,
        _id: '',
      });
      expect(res).toHaveProperty('_id');
    });

    it('should not register existing user', async () => {
      await User.create({
        email: 'exist@example.com',
        password: '123',
        fullname: 'Exist',
        type: UserType.STUDENT,
      });
      const res = await authController.registerUser({
        email: 'exist@example.com',
        password: '123',
        fullname: 'Exist',
        type: UserType.STUDENT,
        _id: '',
      });
      expect(res).toBeUndefined();
    });

    it('should handle DB error', async () => {
      const orig = User.findOne;
      User.findOne = jest.fn().mockRejectedValue(new Error('DB fail'));
      const res = await authController.registerUser({
        email: 'err@example.com',
        password: 'pass',
        fullname: 'Err',
        type: UserType.STUDENT,
        _id: '',
      });
      expect(res).toBeUndefined();
      User.findOne = orig;
    });
  });

  // ─────────────────────────────────────────────
  describe('authenticate', () => {
    it('should authenticate valid user', async () => {
      const password = await bcrypt.hash('Pass123!', 10);
      const user = await User.create({
        email: 'auth@example.com',
        password,
        fullname: 'Auth User',
        type: UserType.STUDENT,
      });
      const res = await authController.authenticate('auth@example.com', 'Pass123!');
      expect(res?.email).toBe(user.email);
    });

    it('should return undefined for invalid password', async () => {
      await User.create({
        email: 'wrong@example.com',
        password: await bcrypt.hash('RightPass', 10),
        fullname: 'Wrong',
        type: UserType.STUDENT,
      });
      const res = await authController.authenticate('wrong@example.com', 'WrongPass');
      expect(res).toBeUndefined();
    });

    it('should return undefined for nonexistent user', async () => {
      const res = await authController.authenticate('nouser@example.com', 'whatever');
      expect(res).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────
  describe('forgotPassword', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'https://frontend.com';
    });

    it('should generate link for existing user', async () => {
      await User.create({
        email: 'reset@example.com',
        password: '123',
        fullname: 'Reset User',
        type: UserType.STUDENT,
      });

      const res = await authController.forgotPassword('reset@example.com');
      expect(res.resetLink).toContain('/reset-password/');
      expect(mockRedisSetex).toHaveBeenCalled();
    });

    it('should handle non-existent user', async () => {
      const res = await authController.forgotPassword('noone@example.com');
      expect(res.message).toContain('reset link');
    });

    it('should handle missing FRONTEND_URL', async () => {
      delete process.env.FRONTEND_URL;
      await expect(authController.forgotPassword('reset@example.com')).resolves.toHaveProperty(
        'message'
      );
    });
  });

  // ─────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should reset valid token', async () => {
      await User.create({
        email: 'reset@example.com',
        password: 'oldPass',
        fullname: 'Reset User',
        type: UserType.STUDENT,
      });

      mockRedisGet.mockResolvedValueOnce('reset@example.com');

      const res = await authController.resetPassword('validtoken', 'NewPass123!');
      expect(res).toBe(true);
    });

    it('should fail invalid token', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      const res = await authController.resetPassword('badtoken', 'NewPass123!');
      expect(res).toBe(false);
    });
  });

  // ─────────────────────────────────────────────
  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const password = await bcrypt.hash('OldPass123!', 10);
      const user = await User.create({
        email: 'change@example.com',
        password,
        fullname: 'Change',
        type: UserType.STUDENT,
      });

      const res = await authController.changePassword(
        user._id.toString(),
        'OldPass123!',
        'NewPass456!'
      );
      expect(res).toBe(true);
    });

    it('should fail wrong old password', async () => {
      const password = await bcrypt.hash('CorrectOld', 10);
      const user = await User.create({
        email: 'fail@example.com',
        password,
        fullname: 'Fail',
        type: UserType.STUDENT,
      });

      const res = await authController.changePassword(
        user._id.toString(),
        'WrongOld',
        'Whatever'
      );
      expect(res).toBe(false);
    });

    it('should fail nonexistent user', async () => {
      const res = await authController.changePassword(
        new mongoose.Types.ObjectId().toString(),
        'Old',
        'New'
      );
      expect(res).toBe(false);
    });
  });
});
