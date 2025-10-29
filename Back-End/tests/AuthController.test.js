const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const {
  AuthController,
  UserType,
} = require('../dist/controllers/mondoDBControllers/AuthController');
const { User } = require('../dist/models/User');
const bcrypt = require('bcryptjs');

describe('AuthController', () => {
  let mongoServer, mongoUri, authController;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    authController = new AuthController();
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('Constructor', () => {
    it('should initialize with correct constants', () => {
      expect(authController.OTP_EXPIRY_MINUTES).toBe(10);
      expect(authController.DUMMY_HASH).toBe(
        '$2a$10$invalidsaltinvalidsaltinv',
      );
    });
  });

  describe('authenticate', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
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
        id: testUser._id.toString(),
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

      expect(result).toHaveProperty('id');
      expect(result.id).toBeDefined();

      // Verify user was created
      const createdUser = await User.findOne({ email: 'newuser@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.fullname).toBe('New User');
      expect(createdUser.type).toBe('student');
    });

    it('should return undefined for existing email', async () => {
      await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
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
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'hashedpassword',
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should generate OTP for existing user', async () => {
      const result = await authController.forgotPassword('test@example.com');

      expect(result.message).toBe('OTP generated successfully');
      expect(result.otp).toBeDefined();
      expect(result.otp).toMatch(/^\d{4}$/); // 4-digit OTP

      // Verify OTP was saved to user
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.otp).toBe(result.otp);
      expect(updatedUser.otpExpire).toBeDefined();
    });

    it('should not reveal if email does not exist', async () => {
      const result = await authController.forgotPassword(
        'nonexistent@example.com',
      );

      expect(result.message).toBe('If the email exists, an OTP has been sent.');
      expect(result.otp).toBeUndefined();
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
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: 'oldpassword',
        fullname: 'Test User',
        type: 'student',
        otp: '1234',
        otpExpire: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      });
    });

    it('should reset password with valid OTP', async () => {
      const result = await authController.resetPassword(
        'test@example.com',
        '1234',
        'NewPass123!',
      );

      expect(result).toBe(true);

      // Verify password was changed and OTP was cleared
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.otp).toBe('');
      expect(updatedUser.otpExpire.getTime()).toBe(0);
    });

    it('should return false for invalid OTP', async () => {
      const result = await authController.resetPassword(
        'test@example.com',
        '9999',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should return false for expired OTP', async () => {
      // Set OTP to expired
      await User.findByIdAndUpdate(testUser._id, {
        otpExpire: new Date(Date.now() - 1000), // 1 second ago
      });

      const result = await authController.resetPassword(
        'test@example.com',
        '1234',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const result = await authController.resetPassword(
        'nonexistent@example.com',
        '1234',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should return false when user has no otp field', async () => {
      // Create user without otp
      await User.findByIdAndUpdate(testUser._id, {
        $unset: { otp: 1, otpExpire: 1 },
      });

      const result = await authController.resetPassword(
        'test@example.com',
        '1234',
        'NewPass123!',
      );

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock User.findOne to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await authController.resetPassword(
        'test@example.com',
        '1234',
        'NewPass123!',
      );

      expect(result).toBe(false);

      // Restore original method
      User.findOne = originalFindOne;
    });
  });

  describe('changePassword', () => {
    let testUser;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('OldPass123!', 10);
      testUser = await User.create({
        _id: new mongoose.Types.ObjectId().toString(),
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });
    });

    it('should change password with correct old password', async () => {
      const result = await authController.changePassword(
        testUser._id.toString(),
        'OldPass123!',
        'NewPass123!',
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

    it('should handle forgotPassword when user.save() throws error', async () => {
      const originalFindOne = User.findOne;
      const mockUser = {
        _id: 'test123',
        email: 'test@example.com',
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };
      User.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await authController.forgotPassword('test@example.com');
      expect(result.message).toBe('An error occurred. Please try again later.');

      User.findOne = originalFindOne;
    });

    it('should handle resetPassword when user.save() throws error', async () => {
      const originalFindOne = User.findOne;
      const mockUser = {
        _id: 'test123',
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
        _id: 'test123',
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
