const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const authController =
  require('../../dist/controllers/authController/authController_mongo').default;
const { User } = require('../../dist/models/User');
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

    const result = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });

    expect(result).toHaveProperty('id');
    const user = await User.findById(result.id);
    expect(user).toBeTruthy();
    expect(user.fullname).toBe(fullname);
    expect(user.email).toBe(email);
    expect(user.type).toBe(type);
    const isMatch = await bcrypt.compare(password, user.password);
    expect(isMatch).toBe(true);
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

  test('should not allow duplicate email registration', async () => {
    const fullname1 = faker.person.firstName() + ' ' + faker.person.lastName();
    const email1 = faker.internet.email();
    const password1 = generateStrongPassword();
    const type1 = 'student';

    const firstResult = await authController.registerUser({
      fullname: fullname1,
      email: email1,
      password: password1,
      type: type1,
    });
    expect(firstResult).toHaveProperty('id');

    const user1 = await User.findById(firstResult.id);
    expect(user1).toBeTruthy();

    const fullname2 = faker.person.firstName() + ' ' + faker.person.lastName();
    const email2 = email1; // Same email as first user
    const password2 = generateStrongPassword();
    const type2 = 'student';

    // attempt to register second user with duplicate email
    const secondResult = await authController.registerUser({
      fullname: fullname2,
      email: email2,
      password: password2,
      type: type2,
    });
    expect(secondResult).toBeUndefined();
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
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    const authResult = await authController.authenticate(email, password);
    expect(authResult).toBeTruthy();
    expect(authResult.fullname).toBe(fullname);
    expect(authResult.email).toBe(email);
    expect(authResult.type).toBe(type);
    expect(authResult.password).toBe(''); // password should not be returned
  });

  test('should not authenticate with wrong password', async () => {
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    const badAuth = await authController.authenticate(
      email,
      'wrongPassword123!',
    );
    expect(badAuth).toBeUndefined();
  });

  test('should not authenticate non-existent user', async () => {
    const authResult = await authController.authenticate(
      'nonexistent',
      'somePassword123!',
    );
    expect(authResult).toBeUndefined();
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
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    // request password reset (generates OTP)
    await authController.forgotPassword(email);

    // retrieve OTP from DB
    const user = await User.findOne({ email });
    const otp = user.otp;

    // reset password using OTP
    const newPassword = generateStrongPassword();
    const resetResult = await authController.resetPassword(
      otp,
      newPassword,
      newPassword,
    );
    expect(resetResult).toBeTruthy();

    // old password should not work
    const oldAuth = await authController.authenticate(email, password);
    expect(oldAuth).toBeUndefined();

    // new password should work
    const newAuth = await authController.authenticate(email, newPassword);
    expect(newAuth).toBeTruthy();
    expect(newAuth.email).toBe(email);

    // otp cannot be reused
    const reuseResult = await authController.resetPassword(
      otp,
      'AnotherPass123!',
      'AnotherPass123!',
    );
    expect(reuseResult).toBeUndefined();

    // password should remain unchanged
    const postReuseAuth = await authController.authenticate(email, newPassword);
    expect(postReuseAuth).toBeTruthy();
    expect(postReuseAuth.email).toBe(email);
  });

  test('should not reset with weak new password', async () => {
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    // request password reset (generates OTP)
    await authController.forgotPassword(email);

    // retrieve OTP from DB
    const user = await User.findOne({ email });
    const otp = user.otp;

    // attempt to reset password with weak new password
    const weakPassword = '12345'; // too short and weak
    const resetResult = await authController.resetPassword(
      otp,
      weakPassword,
      weakPassword,
    );
    expect(resetResult).toBeUndefined();

    // original password should still work
    const authResult = await authController.authenticate(email, password);
    expect(authResult).toBeTruthy();
    expect(authResult.email).toBe(email);
  });

  test('should not reset password with invalid OTP', async () => {
    const resetResult = await authController.resetPassword(
      'nonexistentotp',
      'NewPass123!',
      'NewPass123!',
    );
    expect(resetResult).toBeUndefined();
  });

  test('should not reset password when new password does not match confirmation password', async () => {
    const resetResult = await authController.resetPassword(
      'otp',
      'NewPass123!',
      'NewPass12345!',
    );
    expect(resetResult).toBeUndefined();
  });

  test('should not reset password with expired or missing OTP', async () => {
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    // request password reset (generates OTP)
    await authController.forgotPassword(email);

    // retrieve OTP from DB and set it expired
    const user = await User.findOne({ email }).exec();
    const otp = user.otp;
    user.otpExpire = new Date(Date.now() - 60 * 1000); // 1 minute in the past
    await user.save();

    // attempt to reset password with expired OTP
    const newPassword = generateStrongPassword();
    const resetResult = await authController.resetPassword(
      otp,
      newPassword,
      newPassword,
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
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    const regResult = await authController.registerUser({
      fullname,
      email,
      password,
      type,
    });
    expect(regResult).toHaveProperty('id');

    // request password reset (generates OTP)
    const forgotResult = await authController.forgotPassword(email);
    expect(forgotResult).toBeTruthy();

    // retrieve OTP from DB
    const user = await User.findOne({ email });
    expect(user.otp).toBeTruthy();
    expect(user.otpExpire).toBeTruthy();
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
    const fullname = faker.person.firstName() + ' ' + faker.person.lastName();
    const email = faker.internet.email();
    const password = generateStrongPassword();
    const type = 'student';

    await authController.registerUser({ fullname, email, password, type });
    const result = await authController.forgotPassword(email);

    expect(result).toBeTruthy();
    expect(mockCreateTransport).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalled();
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
    const adminFullname =
      faker.person.firstName() + ' ' + faker.person.lastName();
    const adminEmail = faker.internet.email();
    const adminPassword = generateStrongPassword();
    const adminType = 'admin';

    const studentFullname =
      faker.person.firstName() + ' ' + faker.person.lastName();
    const studentEmail = faker.internet.email();
    const studentPassword = generateStrongPassword();
    const studentType = 'student';

    const adminReg = await authController.registerUser({
      fullname: adminFullname,
      email: adminEmail,
      password: adminPassword,
      type: adminType,
    });
    expect(adminReg).toHaveProperty('id');
    const adminUser = await User.findById(adminReg.id);
    expect(adminUser).toBeTruthy();
    expect(adminUser.type).toBe('admin');

    const studentReg = await authController.registerUser({
      fullname: studentFullname,
      email: studentEmail,
      password: studentPassword,
      type: studentType,
    });
    expect(studentReg).toHaveProperty('id');
    const studentUser = await User.findById(studentReg.id);
    expect(studentUser).toBeTruthy();
    expect(studentUser.type).toBe('student');
    // check admin status
    const isAdminResult = await authController.isAdmin(adminReg.id);
    const isStudentResult = await authController.isAdmin(studentReg.id);

    expect(isAdminResult).toBe(true);
    expect(isStudentResult).toBe(false);
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
