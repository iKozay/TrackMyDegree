const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authController =
  require('../dist/controllers/authController/authController_mongo').default;
const { User } = require('../dist/models/User');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const userTypes = ['student', 'advisor', 'admin'];

// Mock nodemailer
jest.mock('nodemailer');
const mockSendMail = jest.fn().mockResolvedValue(true);
const mockCreateTransport = jest.fn().mockReturnValue({
  sendMail: mockSendMail,
});
nodemailer.createTransport.mockImplementation(mockCreateTransport);

describe('Auth Controller', () => {
  let mongoServer, mongoUri;

  beforeAll(async () => {
    // Start in-memory MongoDB instance for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up connections and stop MongoDB instance
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    mockSendMail.mockClear();
    mockCreateTransport.mockClear();
    // reset any module-level mocks
    jest.clearAllMocks();
  });

  test.each(userTypes)('should register a new user', async (type) => {
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();

    // mock User.findOne to return null (no existing user)
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // mock the save method on User prototype
    const mockId = new mongoose.Types.ObjectId();
    const originalSave = User.prototype.save;
    User.prototype.save = jest.fn().mockImplementation(function() {
      this._id = mockId;
      return Promise.resolve(this);
    });

    const result = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });

    expect(result).toHaveProperty('id');
    expect(result.id).toBe(mockId.toString());
    expect(User.prototype.save).toHaveBeenCalled();

    // restore
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });

  test('should not allow weak password on registration', async () => {
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = faker.internet.password({
      length: 7,
      memorable: true,
      pattern: /[A-Za-z\d@$!%*?&]/,
    });
    const type = 'student';

    const result = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(result).toBeUndefined();
  });

  test('should handle case when _id generation fails at registration', async () => {
    const originalFindOne = User.findOne;
    const originalSave = User.prototype.save;

    // mock User.findOne to return null (no existing user)
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // mock User.prototype.save to return an object without _id
    User.prototype.save = jest.fn().mockImplementation(function() {
      // simulate save succeeding but _id being null/undefined
      this._id = null;
      return Promise.resolve(this);
    });

    const result = await authController.registerUser({
      fullname: 'Test User',
      email: 'test@example.com',
      password: generateStrongPassword(),
      type: 'student',
    });

    expect(result).toBeUndefined();
    expect(User.prototype.save).toHaveBeenCalled();

    // restore
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });


  test('should not allow duplicate email registration', async () => {
    const email = faker.internet.email();

    // first registration
    const originalFindOne1 = User.findOne;
    const originalSave1 = User.prototype.save;
    const mockId1 = new mongoose.Types.ObjectId();

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null), // no existing user
    });
    User.prototype.save = jest.fn().mockImplementation(function() {
      this._id = mockId1;
      return Promise.resolve(this);
    });

    const firstResult = await authController.registerUser({
      fullname: 'First User',
      email,
      password: generateStrongPassword(),
      type: 'student',
    });

    expect(firstResult).toHaveProperty('id');

    // second registration
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ email }), // existing user found
    });

    const secondResult = await authController.registerUser({
      fullname: 'Second User',
      email, // same email
      password: generateStrongPassword(),
      type: 'student',
    });

    expect(secondResult).toBeUndefined();

    // restore
    User.findOne = originalFindOne1;
    User.prototype.save = originalSave1;
  });

  test('should handle saving user error during registration', async () => {
    // mock User.findOne to return null (no existing user)
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // mock User.save to throw an error
    const originalSave = User.prototype.save;
    User.prototype.save = jest
      .fn()
      .mockRejectedValue(new Error('Database save failed'));

    const result = await authController.registerUser({
      fullname: 'Test User',
      email: 'test@example.com',
      password: generateStrongPassword(),
      type: 'student',
    });

    expect(result).toBeUndefined();

    // restore original methods
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });

  test('should authenticate user login', async () => {
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // mock User.findOne to return user with hashed password
    const originalFindOne = User.findOne;
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      fullname: 'Test User',
      email,
      type: 'student',
      password: hashedPassword,
      toObject: () => ({
        _id: new mongoose.Types.ObjectId(),
        fullname: 'Test User',
        email,
        type: 'student',
      }),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const authResult = await authController.authenticate(email, password);

    expect(authResult).toBeTruthy();
    expect(authResult.fullname).toBe('Test User');
    expect(authResult.email).toBe(email);
    expect(authResult.type).toBe('student');
    expect(authResult.password).toBe('');
    // restore
    User.findOne = originalFindOne;
  });

  test('should not authenticate with wrong password', async () => {
    const email = faker.internet.email();
    const correctPassword = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(correctPassword, 10);

    const originalFindOne = User.findOne;
    const mockUser = {
      password: hashedPassword,
      toObject: () => ({ _id: new mongoose.Types.ObjectId() }),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const authResult = await authController.authenticate(email, 'wrongPassword123!');
    expect(authResult).toBeUndefined();
    // restore
    User.findOne = originalFindOne;
  });

  test('should not authenticate non-existent user', async () => {
    const authResult = await authController.authenticate(
      'nonexistent',
      'somePassword123!',
    );
    expect(authResult).toBeUndefined();
  });

  test('should handle case when authenticated user has no _id', async () => {
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    const originalFindOne = User.findOne;

    // mock user that exists but has no _id in toObject()
    const mockUser = {
      password: hashedPassword,
      toObject: () => ({
        _id: null,
        fullname: 'Test User',
        email,
        type: 'student',
      }),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const authResult = await authController.authenticate(email, password);

    expect(authResult).toBeUndefined();
    expect(User.findOne).toHaveBeenCalledWith({ email });

    // restore
    User.findOne = originalFindOne;
  });

  test('should handle database error during authentication', async () => {
    // mock User.findOne to throw an error
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed')),
    });

    const result = await authController.authenticate(
      'test@example.com',
      'somePassword123!',
    );

    expect(result).toBeUndefined();

    // restore original method
    User.findOne = originalFindOne;
  });

  test('should reset password for existing user', async () => {
    const email = faker.internet.email();
    const oldPassword = generateStrongPassword();
    const newPassword = generateStrongPassword();
    const otp = '1234';

    const originalFindOne = User.findOne;
    const originalSave = User.prototype.save;

    // mock user with OTP for reset
    const mockUser = {
      otp,
      otpExpire: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const resetResult = await authController.resetPassword(otp, newPassword, newPassword);
    expect(resetResult).toBeTruthy();
    expect(resetResult.message).toBe('Password has been reset successfully.');
    // restore
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });

  test('should not reset with weak new password', async () => {
    const otp = '1234';
    const weakPassword = '12345';

    const originalFindOne = User.findOne;
    const mockUser = {
      otp,
      otpExpire: new Date(Date.now() + 10 * 60 * 1000),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const resetResult = await authController.resetPassword(otp, weakPassword, weakPassword);
    expect(resetResult).toBeUndefined();
    // restore
    User.findOne = originalFindOne;
  });

  test('should not reset password with expired or missing OTP', async () => {
    const otp = '1234';
    const newPassword = generateStrongPassword();

    const originalFindOne = User.findOne;
    const mockUser = {
      otp,
      otpExpire: new Date(Date.now() - 60 * 1000), // expired (1 minute ago)
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const resetResult = await authController.resetPassword(otp, newPassword, newPassword);
    expect(resetResult).toBeUndefined();

    // restore
    User.findOne = originalFindOne;
  });

  test('should not reset password when new password does not match confirmation password', async () => {
    const resetResult = await authController.resetPassword(
      'otp',
      'NewPass123!',
      'NewPass12345!',
    );
    expect(resetResult).toBeUndefined();
  });

  test('should not reset passsword if otp is missing', async () => {
    const resetResult = await authController.resetPassword(
      null,
      'NewPass123!',
      'NewPass123!',
    );
    expect(resetResult).toBeUndefined();
  });

  test('should handle database error during resetPassword', async () => {
    // mock User.findOne to throw an error
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed')),
    });

    const result = await authController.resetPassword(
      '1234',
      'NewPass123!',
      'NewPass123!',
    );

    expect(result).toBeUndefined();

    // restore original method
    User.findOne = originalFindOne;
  });

  test('should send OTP for password reset', async () => {
    const email = faker.internet.email();

    const originalFindOne = User.findOne;
    const originalSave = User.prototype.save;

    const mockUser = {
      save: jest.fn().mockResolvedValue(),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const forgotResult = await authController.forgotPassword(email);
    expect(forgotResult).toBeTruthy();
    expect(forgotResult.message).toBe('If the email exists, an OTP has been sent.');
    expect(mockUser.save).toHaveBeenCalled();
    // restore
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  });

  test('should not send OTP for non-existent email', async () => {
    const forgotResult = await authController.forgotPassword(
      'notanemail@example.com',
    );
    // function returns a message regardless of email existence for security
    expect(forgotResult).toEqual({
      message: 'If the email exists, an OTP has been sent.',
    });
  });

  test('should send OTP email (mocked)', async () => {
    const email = faker.internet.email();

    const originalFindOne = User.findOne;
    const mockUser = {
      save: jest.fn().mockResolvedValue(),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    const result = await authController.forgotPassword(email);

    expect(result).toBeTruthy();
    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalled();
    //restore
    User.findOne = originalFindOne;
  });

  test('should handle database error during forgot password', async () => {
    // mock User.findOne to throw an error
    const originalFindOne = User.findOne;
    User.findOne = jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed')),
    });

    const result = await authController.forgotPassword('test@example.com');

    expect(result).toBeUndefined();

    // restore original method
    User.findOne = originalFindOne;
  });

  test('only admin users are recognized as admins', async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    const studentId = new mongoose.Types.ObjectId().toString();

    const originalFindById = User.findById;

    // mock findById to return different users based on ID
    User.findById = jest.fn().mockImplementation((id) => ({
      exec: jest.fn().mockResolvedValue(
        id === adminId
          ? { type: 'admin' }
          : id === studentId
            ? { type: 'student' }
            : null
      ),
    }));

    const isAdminResult = await authController.isAdmin(adminId);
    const isStudentResult = await authController.isAdmin(studentId);

    expect(isAdminResult).toBe(true);
    expect(isStudentResult).toBe(false);
    //restore
    User.findById = originalFindById;
  });

  test('should return false when user not found in isAdmin', async () => {
    // use a valid MongoDB ObjectId format that doesn't exist
    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const result = await authController.isAdmin(nonExistentId);

    expect(result).toBe(false);
  });

  test('should handle database error in isAdmin', async () => {
    const originalFindById = User.findById;
    User.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue(new Error('Database error')),
    });

    const result = await authController.isAdmin('test-id');
    expect(result).toBeUndefined();

    User.findById = originalFindById;
  });

  test('should handle bcrypt error during registration', async () => {
    const originalFindOne = User.findOne;
    const originalHash = bcrypt.hash;

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    bcrypt.hash = jest.fn().mockRejectedValue(new Error('Bcrypt error'));

    const result = await authController.registerUser({
      fullname: 'Test User',
      email: 'unique@example.com',
      password: generateStrongPassword(),
      type: 'student',
    });

    expect(result).toBeUndefined();

    User.findOne = originalFindOne;
    bcrypt.hash = originalHash;
  });

  test('should handle bcrypt error during password reset', async () => {
    const originalFindOne = User.findOne;
    const originalHash = bcrypt.hash;

    // Mock finding user with valid OTP
    const mockUser = {
      otp: '1234',
      otpExpire: new Date(Date.now() + 10 * 60 * 1000),
    };

    User.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockUser),
    });

    bcrypt.hash = jest.fn().mockRejectedValue(new Error('Bcrypt error'));

    const newPassword = generateStrongPassword();
    const result = await authController.resetPassword(
      '1234',
      newPassword,
      newPassword,
    );

    expect(result).toBeUndefined();

    User.findOne = originalFindOne;
    bcrypt.hash = originalHash;
  });
});

// Helper function to generate strong passwords for testing
function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specials = '@$!%*?&';

  // Ensure at least one character from each required category
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specials[Math.floor(Math.random() * specials.length)];

  // Fill remaining length with random valid characters
  const allChars = uppercase + lowercase + numbers + specials;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}
