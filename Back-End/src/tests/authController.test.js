// __tests__/authController.test.js

// Mock Nodemailer (in __mocks__ folder)

// Mock shared Redis client


const bcrypt = require('bcryptjs');
const { authController, AuthController, UserType } = require('../controllers/authController');
const { User } = require('@models');
const { AlreadyExistsError, NotFoundError, UnauthorizedError } = require('@utils/errors');
const { mailServicePromise } = require('@services/mailService');
const redisClient = require('@lib/redisClient').default;


jest.mock('@lib/redisClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    },
}));
jest.mock('@models');
jest.mock('bcryptjs');
jest.mock('nodemailer');
jest.mock('@models');

jest.mock('@services/mailService', () => ({
  mailServicePromise: {
    then: (cb) => cb({ sendPasswordReset: jest.fn().mockResolvedValue(true) }),
  },
}));


describe('AuthController', () => {
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: 'user123',
      fullname: 'Test User',
      email: 'test@example.com',
      type: UserType.STUDENT,
      password: 'hashedpassword',
      save: jest.fn().mockResolvedValue(true),
    };

    // Default bcrypt behavior
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashedpassword');
  });

  describe('getUserById', () => {
    it('returns user info when user exists', async () => {
      User.findById.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(mockUser) }) });

      const result = await authController.getUserById('user123');
      expect(result).toEqual({
        _id: 'user123',
        fullname: 'Test User',
        email: 'test@example.com',
        type: UserType.STUDENT,
      });
    });

    it('throws NotFoundError if user does not exist', async () => {
      User.findById.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

      await expect(authController.getUserById('wrong')).rejects.toThrow(NotFoundError);
    });
  });

  describe('authenticate', () => {
    it('returns user info if credentials are correct', async () => {
      User.findOne.mockReturnValue({
        select: () => ({ lean: () => ({ exec: () => Promise.resolve(mockUser) }) }),
      });

      const result = await authController.authenticate('test@example.com', 'password');
      expect(result.email).toBe('test@example.com');
    });

    it('throws UnauthorizedError if user not found', async () => {
      User.findOne.mockReturnValue({
        select: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
      });

      await expect(authController.authenticate('wrong@example.com', 'pass')).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError if password mismatch', async () => {
      bcrypt.compare.mockResolvedValue(false);
      User.findOne.mockReturnValue({
        select: () => ({ lean: () => ({ exec: () => Promise.resolve(mockUser) }) }),
      });

      await expect(authController.authenticate('test@example.com', 'wrongpass')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('registerUser', () => {
    it('registers a new user successfully', async () => {
      User.exists.mockReturnValue({ exec: () => Promise.resolve(false) });
      User.create.mockResolvedValue(mockUser);

      const result = await authController.registerUser({
        _id: 'user123',
        fullname: 'Test User',
        email: 'test@example.com',
        type: UserType.STUDENT,
      }, 'password');

      expect(result.email).toBe('test@example.com');
    });

    it('throws AlreadyExistsError if email already exists', async () => {
      User.exists.mockReturnValue({ exec: () => Promise.resolve(true) });

      await expect(authController.registerUser({
        _id: 'user123',
        fullname: 'Test User',
        email: 'test@example.com',
        type: UserType.STUDENT,
      }, 'password')).rejects.toThrow(AlreadyExistsError);
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message if user does not exist', async () => {
      User.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

      const result = await authController.forgotPassword('unknown@example.com');
      expect(result.message).toBe('If the email exists, a reset link has been sent.');
    });

    it('sends reset email and stores token in Redis', async () => {
      process.env.FRONTEND_URL = 'http://frontend.com';
      User.findOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });
      redisClient.set.mockResolvedValue(true);

      const result = await authController.forgotPassword('test@example.com');
      expect(result.message).toBe('If the email exists, a reset link has been sent.');
      expect(redisClient.set).toHaveBeenCalled();
    });
    it('throws error if FRONTEND_URL and CLIENT are not defined', async () => {
    // Remove env variables
    delete process.env.FRONTEND_URL;
    delete process.env.CLIENT;

    User.findOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });

    await expect(authController.forgotPassword('test@example.com'))
      .rejects
      .toThrow('FRONTEND_URL or CLIENT environment variable is not defined');
  });
  });

  describe('resetPassword', () => {
    it('resets password successfully', async () => {
      redisClient.get.mockResolvedValue('test@example.com');
      User.findOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });
      redisClient.del.mockResolvedValue(true);

      await expect(authController.resetPassword('token123', 'newpass')).resolves.toBeUndefined();
      expect(mockUser.password).toBe('hashedpassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith('reset:token123');
    });

    it('throws UnauthorizedError if token invalid', async () => {
      redisClient.get.mockResolvedValue(null);
      await expect(authController.resetPassword('badtoken', 'newpass')).rejects.toThrow(UnauthorizedError);
    });

    it('throws NotFoundError if user no longer exists', async () => {
      redisClient.get.mockResolvedValue('test@example.com');
      User.findOne.mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(authController.resetPassword('token123', 'newpass')).rejects.toThrow(NotFoundError);
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      User.findById.mockReturnValue({ select: () => ({ exec: () => Promise.resolve(mockUser) }) });

      await expect(authController.changePassword('user123', 'oldpass', 'newpass')).resolves.toBeUndefined();
      expect(mockUser.password).toBe('hashedpassword');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('throws NotFoundError if user not found', async () => {
      User.findById.mockReturnValue({ select: () => ({ exec: () => Promise.resolve(null) }) });
      await expect(authController.changePassword('user123', 'old', 'new')).rejects.toThrow(NotFoundError);
    });

    it('throws UnauthorizedError if old password does not match', async () => {
      bcrypt.compare.mockResolvedValue(false);
      User.findById.mockReturnValue({ select: () => ({ exec: () => Promise.resolve(mockUser) }) });

      await expect(authController.changePassword('user123', 'wrong', 'new')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin user', async () => {
      const adminUser = { ...mockUser, type: UserType.ADMIN };
      User.findById.mockReturnValue({ exec: () => Promise.resolve(adminUser) });
      const result = await authController.isAdmin('user123');
      expect(result).toBe(true);
    });

    it('returns false for non-admin user', async () => {
      User.findById.mockReturnValue({ exec: () => Promise.resolve(mockUser) });
      const result = await authController.isAdmin('user123');
      expect(result).toBe(false);
    });
  });
});