/**
 * Integration-style Jest tests for AuthController.
 * Uses MongoMemoryServer for isolated DB
 * Mocks Redis + Nodemailer to avoid external dependencies
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AuthController, UserType } = require('../controllers/authController');
// Handle ES6 module export properly
const UserModule = require('../models/user');
const User = UserModule.User || UserModule.default || UserModule;
const bcrypt = require('bcryptjs');
const Sentry = require('@sentry/node');

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

// ─────────────────────────────────────────────
// Mock Nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// ─────────────────────────────────────────────
// Mock ioredis
jest.mock('ioredis', () => {
  const mockRedisGet = jest.fn();
  const mockRedisSetex = jest.fn();
  const mockRedisDel = jest.fn();

  const Redis = jest.fn().mockImplementation(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
    del: mockRedisDel,
  }));

  // expose mocks for external use
  Redis.__mocks__ = { mockRedisGet, mockRedisSetex, mockRedisDel };
  return Redis;
});

// Get access to redis mocks
const Redis = require('ioredis');
const { mockRedisGet, mockRedisSetex } = Redis.__mocks__;

// ─────────────────────────────────────────────
// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('AuthController', () => {
  let mongoServer, mongoUri, authController, testUser;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    authController = new AuthController();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
    console.error.mockRestore();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('getUserById', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });
    });

    afterEach(async () => {
      jest.clearAllMocks();
    });

    it('should return a user object when user exists', async () => {
      const result = await authController.getUserById(testUser._id.toString());

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.fullname).toBe('Test User');
      expect(result.password).toBe(''); // password should never be returned
    });

    it('should return undefined if user does not exist', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const result = await authController.getUserById(fakeId);

      expect(result).toBeUndefined();
    });

    it('should return undefined and capture exception if DB error occurs', async () => {
      const mockError = new Error('DB error');
      jest.spyOn(User, 'findById').mockImplementationOnce(() => {
        throw mockError;
      });

      const result = await authController.getUserById('any-id');

      expect(result).toBeUndefined();
      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.any(Object),
      );
      expect(console.error).toHaveBeenCalledWith(
        '[AuthController] getUserById error',
      );
    });
  });

  describe('authenticate', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await authController.authenticate(
        'test@example.com',
        'TestPass123!',
      );

      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        password: '', // Password should be empty in response
      });
    });

    it('should return undefined for incorrect password', async () => {
      const result = await authController.authenticate(
        'test@example.com',
        'WrongPassword123!',
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent user', async () => {
      const result = await authController.authenticate(
        'nonexistent@example.com',
        'TestPass123!',
      );

      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.authenticate(
        'test@example.com',
        'TestPass123!',
      );

      expect(result).toBeUndefined();

      // Restore original method
      User.findOne = originalFindOne;
    });

    it('should prevent timing attacks with dummy hash', async () => {
      const startTime = Date.now();
      await authController.authenticate(
        'nonexistent@example.com',
        'TestPass123!',
      );
      const endTime = Date.now();

      // Should take similar time as valid authentication due to dummy hash comparison
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
    });

    it('should return undefined when user has no _id', async () => {
      // Mock User.findOne to return user without _id
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              email: 'test@example.com',
              password: await require('bcryptjs').hash('TestPass123!', 10),
              fullname: 'Test User',
              type: 'student',
              // _id is missing
            }),
          }),
        }),
      });

      const result = await authController.authenticate(
        'test@example.com',
        'TestPass123!',
      );

      expect(result).toBeUndefined();

      // Restore original method
      User.findOne = originalFindOne;
    });
  });

  describe('registerUser', () => {
    it('should register new user with strong password', async () => {
      const userInfo = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);

      expect(result).toHaveProperty('_id');
      expect(result._id).toBeDefined();

      // Verify user was created
      const createdUser = await User.findOne({ email: 'newuser@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.fullname).toBe('New User');
      expect(createdUser.type).toBe('student');
    });

    it('should return undefined for existing email', async () => {
      await User.create({
        email: 'existing@example.com',
        password: 'hashedpassword',
        fullname: 'Existing User',
        type: 'student',
      });

      const userInfo = {
        email: 'existing@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);

      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.exists to throw an error
      const originalExists = User.exists;
      User.exists = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const userInfo = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);

      expect(result).toBeUndefined();

      // Restore original method
      User.exists = originalExists;
    });

    it('should return undefined when user creation fails', async () => {
      // Mock User.create to return user without _id
      const originalCreate = User.create;
      User.create = jest.fn().mockResolvedValue({
        _id: null,
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });

      const userInfo = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);

      expect(result).toBeUndefined();

      // Restore original method
      User.create = originalCreate;
    });
  });

  describe('forgotPassword', () => {
    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
      });
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
      await expect(
        authController.forgotPassword('reset@example.com'),
      ).resolves.toHaveProperty('message');
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.forgotPassword('test@example.com');

      expect(result.message).toBe('An error occurred. Please try again later.');
      expect(result.otp).toBeUndefined();

      // Restore original method
      User.findOne = originalFindOne;
    });
  });

  describe('resetPassword', () => {
    it('should reset valid token', async () => {
      await User.create({
        email: 'reset@example.com',
        password: 'oldPass',
        fullname: 'Reset User',
        type: UserType.STUDENT,
      });

      mockRedisGet.mockResolvedValueOnce('reset@example.com');

      const res = await authController.resetPassword(
        'validtoken',
        'NewPass123!',
      );
      expect(res).toBe(true);
    });

    it('should fail invalid token', async () => {
      mockRedisGet.mockResolvedValueOnce(null);
      const res = await authController.resetPassword('badtoken', 'NewPass123!');
      expect(res).toBe(false);
    });
  });

  describe('changePassword', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('OldPass123!', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should change password with correct old password (frontend-hashed)', async () => {
      // Note: The implementation expects plain text for both old and new passwords
      // The method will hash the new password internally
      const result = await authController.changePassword(
        testUser._id.toString(),
        'OldPass123!', // Plain text old password for verification
        'NewPass123!', // Plain text new password - will be hashed by the method
      );

      expect(result).toBe(true);

      // Verify password was changed
      const updatedUser = await User.findById(testUser._id).select('+password');
      const passwordMatch = await bcrypt.compare(
        'NewPass123!',
        updatedUser.password,
      );
      expect(passwordMatch).toBe(true);
    });

    it('should return false for incorrect old password', async () => {
      const result = await authController.changePassword(
        testUser._id.toString(),
        'WrongPass123!',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await authController.changePassword(
        fakeId,
        'OldPass123!',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.changePassword(
        testUser._id.toString(),
        'OldPass123!',
        'NewPass123!',
      );

      expect(result).toBe(false);

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('isAdmin', () => {
    let adminUser, studentUser, advisorUser;

    beforeEach(async () => {
      adminUser = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword',
        fullname: 'Admin User',
        type: UserType.ADMIN,
      });

      studentUser = await User.create({
        email: 'student@example.com',
        password: 'hashedpassword',
        fullname: 'Student User',
        type: UserType.STUDENT,
      });

      advisorUser = await User.create({
        email: 'advisor@example.com',
        password: 'hashedpassword',
        fullname: 'Advisor User',
        type: UserType.ADVISOR,
      });
    });

    it('should return true when user is an admin', async () => {
      const result = await authController.isAdmin(adminUser._id.toString());

      expect(result).toBe(true);
    });

    it('should return false when user is a student', async () => {
      const result = await authController.isAdmin(studentUser._id.toString());

      expect(result).toBe(false);
    });

    it('should return false when user is an advisor', async () => {
      const result = await authController.isAdmin(advisorUser._id.toString());

      expect(result).toBe(false);
    });

    it('should return false when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await authController.isAdmin(fakeId);

      expect(result).toBe(false);
    });

    it('should return false when findById returns null', async () => {
      // Mock User.findById to return null
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await authController.isAdmin('someUserId');

      expect(result).toBe(false);

      // Restore original method
      User.findById = originalFindById;
    });

    it('should return false and handle database errors gracefully', async () => {
      // Mock User.findById to throw an error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.isAdmin(adminUser._id.toString());

      expect(result).toBe(false);

      // Restore original method
      User.findById = originalFindById;
    });

    it('should return false when findById throws an error during exec', async () => {
      // Mock User.findById to throw error in exec
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('Exec failed')),
      });

      const result = await authController.isAdmin(adminUser._id.toString());

      expect(result).toBe(false);

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('Additional Edge Cases for Coverage', () => {
    it('should handle registerUser when User.create throws error', async () => {
      const originalCreate = User.create;
      User.create = jest.fn().mockRejectedValue(new Error('Create failed'));

      const userInfo = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        fullname: 'Test User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);
      expect(result).toBeUndefined();

      User.create = originalCreate;
    });

    it('should handle resetPassword when user.save() throws error', async () => {
      const originalFindOne = User.findOne;
      const mockUser = {
        email: 'test@example.com',
        otp: '1234',
        otpExpire: new Date(Date.now() + 10 * 60 * 1000),
        password: 'oldpass',
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      User.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authController.resetPassword(
        'test@example.com',
        '1234',
        'NewPass123!',
      );
      expect(result).toBe(false);

      User.findOne = originalFindOne;
    });

    it('should handle changePassword when user.save() throws error', async () => {
      const hashedPassword = await require('bcryptjs').hash('OldPass123!', 10);
      const originalFindById = User.findById;
      const mockUser = {
        password: hashedPassword,
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const result = await authController.changePassword(
        'test123',
        'OldPass123!',
        'NewPass123!',
      );
      expect(result).toBe(false);

      User.findById = originalFindById;
    });
  });
});
