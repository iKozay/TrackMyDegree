const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { AuthController, UserType } = require('../dist/controllers/mondoDBControllers/AuthController');
const { User } = require('../dist/models/User');
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

    it('authenticates with correct credentials', async () => {
      const result = await authController.authenticate('test@example.com', 'TestPass123!');
      expect(result).toMatchObject({
        id: testUser._id.toString(),
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
        password: '',
      });
    });

    it('returns undefined for wrong password', async () => {
      const result = await authController.authenticate('test@example.com', 'WrongPass!');
      expect(result).toBeUndefined();
    });

    it('returns undefined for non-existent user', async () => {
      const result = await authController.authenticate('nonexistent@example.com', 'TestPass123!');
      expect(result).toBeUndefined();
    });
  });

  describe('registerUser', () => {
    it('registers a new user', async () => {
      const userInfo = {
        email: 'newuser@example.com',
        password: 'StrongPass123!', // Already hashed in frontend
        fullname: 'New User',
        type: UserType.STUDENT,
      };

      const result = await authController.registerUser(userInfo);
      expect(result).toHaveProperty('id');

      const user = await User.findOne({ email: 'newuser@example.com' });
      expect(user).toBeDefined();
      expect(user.fullname).toBe('New User');
      expect(user.type).toBe('student');
    });

    it('returns undefined if email exists', async () => {
      await User.create({
        email: 'existing@example.com',
        password: 'hashedpassword',
        fullname: 'Existing User',
        type: UserType.STUDENT,
      });

      const result = await authController.registerUser({
        email: 'existing@example.com',
        password: 'StrongPass123!',
        fullname: 'New User',
        type: UserType.STUDENT,
      });
      expect(result).toBeUndefined();
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

    it('generates reset link for existing user', async () => {
      const result = await authController.forgotPassword('test@example.com');
      expect(result.message).toBe('Password reset link generated');
      expect(result.resetLink).toMatch(/reset-password\/[a-f0-9]{64}/);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetToken).toBeDefined();
      expect(updatedUser.resetTokenExpire.getTime()).toBeGreaterThan(Date.now());
    });

    it('does not reveal non-existent email', async () => {
      const result = await authController.forgotPassword('nonexistent@example.com');
      expect(result.message).toBe('If the email exists, a reset link has been sent.');
      expect(result.resetLink).toBeUndefined();
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

    it('resets password with valid token', async () => {
      const result = await authController.resetPassword('test@example.com', 'validtoken', 'NewPass123!');
      expect(result).toBe(true);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.password).toBe('NewPass123!');
      expect(updatedUser.resetToken).toBe('');
      expect(updatedUser.resetTokenExpire.getTime()).toBe(0);
    });

    it('returns false for invalid token', async () => {
      const result = await authController.resetPassword('test@example.com', 'wrongtoken', 'NewPass123!');
      expect(result).toBe(false);
    });

    it('returns false for expired token', async () => {
      await User.findByIdAndUpdate(testUser._id, {
        resetTokenExpire: new Date(Date.now() - 1000),
      });
      const result = await authController.resetPassword('test@example.com', 'validtoken', 'NewPass123!');
      expect(result).toBe(false);
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

    it('changes password with correct old password', async () => {
      const result = await authController.changePassword(testUser._id.toString(), 'OldPass123!', 'NewPass123!');
      expect(result).toBe(true);

      const updatedUser = await User.findById(testUser._id).select('+password');
      const match = await bcrypt.compare('NewPass123!', updatedUser.password);
      expect(match).toBe(true);
    });

    it('returns false for incorrect old password', async () => {
      const result = await authController.changePassword(testUser._id.toString(), 'WrongPass!', 'NewPass123!');
      expect(result).toBe(false);
    });
  });
});
