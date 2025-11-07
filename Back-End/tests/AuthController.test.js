/**
 * Integration-style Jest tests for AuthController.
 * - Uses MongoMemoryServer for isolated DB
 * - Mocks Redis + Nodemailer to avoid external dependencies
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const { AuthController, UserType } = require('../controllers/mondoDBControllers/AuthController');
const { User } = require('../models/User');

// ────────────────────────────────────────────────
// Mock Nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// ────────────────────────────────────────────────
// Mock Redis client (for forgotPassword/resetPassword)
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
  }));
});

jest.setTimeout(20000); // CI environments can be slow

describe('AuthController', () => {
  let mongoServer;
  let authController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    authController = new AuthController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  // ────────────────────────────────────────────────
  describe('Constructor', () => {
    it('should initialize with correct constants', () => {
      expect(authController.RESET_EXPIRY_MINUTES).toBeDefined();
      expect(authController.DUMMY_HASH).toBeDefined();
      expect(typeof authController.RESET_EXPIRY_MINUTES).toBe('number');
      expect(typeof authController.DUMMY_HASH).toBe('string');
    });
  });

  // ────────────────────────────────────────────────
  describe('authenticate', () => {
    let testUser;

    beforeEach(async () => {
      const hashed = await bcrypt.hash('TestPass123!', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashed,
        fullname: 'Test User',
        type: UserType.STUDENT,
      });
    });

    it('should authenticate valid credentials', async () => {
      const result = await authController.authenticate('test@example.com', 'TestPass123!');
      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      expect(result.password).toBe('');
    });

    it('should return undefined for wrong password', async () => {
      const result = await authController.authenticate('test@example.com', 'Wrong!');
      expect(result).toBeUndefined();
    });

    it('should return undefined for nonexistent email', async () => {
      const result = await authController.authenticate('noone@example.com', 'TestPass123!');
      expect(result).toBeUndefined();
    });

    it('should handle database error gracefully', async () => {
      const original = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('DB down');
      });
      const result = await authController.authenticate('test@example.com', 'TestPass123!');
      expect(result).toBeUndefined();
      User.findOne = original;
    });
  });

  // ────────────────────────────────────────────────
  describe('registerUser', () => {
    it('should register new user', async () => {
      const data = {
        email: 'new@example.com',
        password: 'Strong123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };
      const res = await authController.registerUser(data);
      expect(res).toHaveProperty('_id');
      const found = await User.findOne({ email: 'new@example.com' });
      expect(found).not.toBeNull();
    });

    it('should not register duplicate email', async () => {
      await User.create({
        email: 'dup@example.com',
        password: 'hash',
        fullname: 'Dup',
        type: UserType.STUDENT,
      });
      const res = await authController.registerUser({
        email: 'dup@example.com',
        password: 'Strong!',
        fullname: 'Again',
        type: UserType.STUDENT,
      });
      expect(res).toBeUndefined();
    });

    it('should handle DB error', async () => {
      const orig = User.exists;
      User.exists = jest.fn().mockRejectedValue(new Error('DB fail'));
      const res = await authController.registerUser({
        email: 'err@example.com',
        password: 'pass',
        fullname: 'Err',
        type: UserType.STUDENT,
      });
      expect(res).toBeUndefined();
      User.exists = orig;
    });
  });

  // ────────────────────────────────────────────────
  describe('forgotPassword', () => {
    beforeEach(async () => {
      await User.create({
        email: 'reset@example.com',
        password: 'hash',
        fullname: 'Reset',
        type: UserType.STUDENT,
      });
    });

    it('should generate link for existing user', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';
      const res = await authController.forgotPassword('reset@example.com');
      expect(res.message).toBe('Password reset link sent successfully');
      expect(res.resetLink).toMatch(/reset-password\/[a-f0-9\-]{36}/); // uuid v4
    });

    it('should not reveal if email not found', async () => {
      const res = await authController.forgotPassword('noone@example.com');
      expect(res.message).toBe('If the email exists, a reset link has been sent.');
    });

    it('should handle DB error', async () => {
      const orig = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('DB failed');
      });
      const res = await authController.forgotPassword('reset@example.com');
      expect(res.message).toBe('An error occurred. Please try again later.');
      User.findOne = orig;
    });
  });

  // ────────────────────────────────────────────────
  describe('resetPassword', () => {
    let redisMock;
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'reset@example.com',
        password: 'oldhash',
        fullname: 'Reset User',
        type: UserType.STUDENT,
      });

      redisMock = require('ioredis').mock.instances[0];
      redisMock.get.mockResolvedValueOnce('reset@example.com');
    });

    it('should reset valid token', async () => {
      const res = await authController.resetPassword('validtoken', 'NewPass123!');
      expect(res).toBe(true);
    });

    it('should fail invalid token', async () => {
      redisMock.get.mockResolvedValueOnce(null);
      const res = await authController.resetPassword('wrongtoken', 'NewPass123!');
      expect(res).toBe(false);
    });

    it('should handle DB error', async () => {
      const orig = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('DB fail');
      });
      redisMock.get.mockResolvedValueOnce('reset@example.com');
      const res = await authController.resetPassword('validtoken', 'NewPass123!');
      expect(res).toBe(false);
      User.findOne = orig;
    });
  });

  // ────────────────────────────────────────────────
  describe('changePassword', () => {
    let user;
    beforeEach(async () => {
      const hashed = await bcrypt.hash('OldPass123!', 10);
      user = await User.create({
        email: 'test@example.com',
        password: hashed,
        fullname: 'User',
        type: UserType.STUDENT,
      });
    });

    it('should change password correctly', async () => {
      const ok = await authController.changePassword(user._id.toString(), 'OldPass123!', 'NewPass123!');
      expect(ok).toBe(true);
    });

    it('should reject incorrect old password', async () => {
      const ok = await authController.changePassword(user._id.toString(), 'BadPass!', 'NewPass123!');
      expect(ok).toBe(false);
    });

    it('should return false for nonexistent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const ok = await authController.changePassword(fakeId, 'OldPass123!', 'NewPass123!');
      expect(ok).toBe(false);
    });

    it('should handle DB error', async () => {
      const orig = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('DB fail');
      });
      const ok = await authController.changePassword(user._id.toString(), 'OldPass123!', 'NewPass123!');
      expect(ok).toBe(false);
      User.findById = orig;
    });
  });
});
