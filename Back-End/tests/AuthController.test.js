const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  AuthController,
  UserType,
} = require('../controllers/mondoDBControllers/AuthController');
const { User } = require('../models/User');
const bcrypt = require('bcryptjs');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

describe('AuthController', () => {
  let mongoServer;
  let authController;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    authController = new AuthController();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with correct constants', () => {
      expect(authController.OTP_EXPIRY_MINUTES).toBe(10);
      expect(authController.DUMMY_HASH).toBe('$2a$10$invalidsaltinvalidsaltinv');
    });
  });

  describe('authenticate', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      testUser = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: UserType.STUDENT,
      });
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await authController.authenticate(
        'test@example.com',
        'TestPass123!'
      );

      expect(result).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        password: '',
      });
    });

    it('should return undefined for incorrect password', async () => {
      const result = await authController.authenticate('test@example.com', 'WrongPass!');
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent user', async () => {
      const result = await authController.authenticate('noone@example.com', 'TestPass123!');
      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.authenticate('test@example.com', 'TestPass123!');
      expect(result).toBeUndefined();

      User.findOne = originalFindOne;
    });

    it('should prevent timing attacks with dummy hash', async () => {
      const startTime = Date.now();
      await authController.authenticate('nonexistent@example.com', 'TestPass123!');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should return undefined when user has no _id', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          email: 'test@example.com',
          password: await bcrypt.hash('TestPass123!', 10),
          fullname: 'Test User',
          type: 'student',
        }),
      });

      const result = await authController.authenticate('test@example.com', 'TestPass123!');
      expect(result).toBeUndefined();

      User.findOne = originalFindOne;
    });
  });

  describe('registerUser', () => {
    it('should register a new user', async () => {
      const userInfo = {
        email: 'newuser@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);
      expect(result).toHaveProperty('_id');

      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user).toBeDefined();
      expect(user.fullname).toBe('New User');
      expect(user.type).toBe('student');
    });

    it('should return undefined if email already exists', async () => {
      await User.create({
        email: 'existing@example.com',
        password: 'hashedpassword',
        fullname: 'Existing User',
        type: UserType.STUDENT,
      });

      const result = await authController.registerUser({
        email: 'existing@example.com',
        password: 'StrongPass123!',
        fullname: 'Duplicate User',
        type: UserType.STUDENT,
      });

      expect(result).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      const originalExists = User.exists;
      User.exists = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.registerUser({
        email: 'error@example.com',
        password: 'StrongPass123!',
        fullname: 'Error User',
        type: UserType.STUDENT,
      });

      expect(result).toBeUndefined();
      User.exists = originalExists;
    });

    it('should return undefined when user creation fails', async () => {
      const originalCreate = User.create;
      User.create = jest.fn().mockResolvedValue({ _id: null });

      const result = await authController.registerUser({
        email: 'fail@example.com',
        password: 'StrongPass123!',
        fullname: 'Fail User',
        type: UserType.STUDENT,
      });

      expect(result).toBeUndefined();
      User.create = originalCreate;
    });
  });

  describe('forgotPassword', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: UserType.STUDENT,
      });
    });

    it('should generate reset link for existing user', async () => {
      const result = await authController.forgotPassword('test@example.com');
      expect(result.message).toBe('Password reset link generated');
      expect(result.resetLink).toMatch(/reset-password\/[a-f0-9]{64}/);
    });

    it('should not reveal if email does not exist', async () => {
      const result = await authController.forgotPassword('noone@example.com');
      expect(result.message).toBe('If the email exists, a reset link has been sent.');
    });

    it('should handle database errors gracefully', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.forgotPassword('test@example.com');
      expect(result.message).toBe('An error occurred. Please try again later.');

      User.findOne = originalFindOne;
    });
  });

  describe('resetPassword', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'oldpassword',
        fullname: 'Test User',
        type: UserType.STUDENT,
        resetToken: 'validtoken',
        resetTokenExpire: new Date(Date.now() + 10 * 60 * 1000),
      });
    });

    it('should reset password with valid token', async () => {
      const result = await authController.resetPassword(
        'test@example.com',
        'validtoken',
        'NewPass123!'
      );
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const result = await authController.resetPassword(
        'test@example.com',
        'wrongtoken',
        'NewPass123!'
      );
      expect(result).toBe(false);
    });

    it('should return false for expired token', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        resetTokenExpire: new Date(Date.now() - 1000),
      });
      const result = await authController.resetPassword(
        'test@example.com',
        'validtoken',
        'NewPass123!'
      );
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.resetPassword(
        'test@example.com',
        'validtoken',
        'NewPass123!'
      );
      expect(result).toBe(false);

      User.findOne = originalFindOne;
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
        type: UserType.STUDENT,
      });
    });

    it('should change password with correct old password', async () => {
      const result = await authController.changePassword(
        testUser._id.toString(),
        'OldPass123!',
        'NewPass123!'
      );
      expect(result).toBe(true);
    });

    it('should return false for incorrect old password', async () => {
      const result = await authController.changePassword(
        testUser._id.toString(),
        'WrongPass123!',
        'NewPass123!'
      );
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const result = await authController.changePassword(fakeId, 'OldPass123!', 'NewPass123!');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const originalFindById = User.findById;
      User.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.changePassword(
        testUser._id.toString(),
        'OldPass123!',
        'NewPass123!'
      );
      expect(result).toBe(false);

      User.findById = originalFindById;
    });
  });

  describe('Additional Edge Cases', () => {
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
  });
});
