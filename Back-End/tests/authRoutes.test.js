// Set up environment variables
process.env.JWT_ORG_ID = 'test-org-id';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../routes/authRoutes').default;
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const { authController } = require('../controllers/authController');

jest.mock('../services/jwtService', () => ({
  jwtService: {
    generateToken: jest.fn(() => 'mock-token'),
    setAccessCookie: jest.fn(() => ({
      name: 'access_token',
      value: 'mock-token',
      config: {},
    })),
    setRefreshCookie: jest.fn(() => ({
      name: 'refresh_token',
      value: 'mock-refresh-token',
      config: {},
    })),
  },
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

describe('Auth Routes (MongoDB)', () => {
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
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return 200 and login user with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        email: 'test@example.com',
        fullname: 'Test User',
        type: 'student',
      });
      expect(response.body._id).toBeDefined();
    });

    it('should return 401 for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        fullname: 'Test User',
        type: 'student',
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.error).toBe('Incorrect email or password');
    });

    it('should return 400 for missing email or password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          // Missing password
        })
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('POST /auth/signup', () => {
    it('should return 201 and create new user', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'TestPass123!',
          fullname: 'New User',
          type: 'student',
        })
        .expect(201);

      expect(response.body._id).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      await User.create({
        email: 'existing@example.com',
        password: hashedPassword,
        fullname: 'Existing User',
        type: 'student',
      });

      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'TestPass123!',
          fullname: 'Duplicate User',
          type: 'student',
        })
        .expect(409);

      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          // Missing hashed_password, fullname, type
        })
        .expect(400);

      expect(response.body.error).toBe('Email, password, fullname, and type are required');
    });

    it('should return 400 for invalid user type', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
          fullname: 'Test User',
          type: 'invalid_type',
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid user type');
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 202 and generate OTP for existing user', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashed',
        fullname: 'Test User',
        type: 'student',
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com',
        })
        .expect(202);

      expect(response.body.message).toBeDefined();
    });

    it('should return 202 even for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(202);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Request body cannot be empty');
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should return 202 for valid OTP and reset password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'oldpassword',
        fullname: 'Test User',
        type: 'student',
        otp: '1234',
        otpExpire: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      });

      const hashedNewPassword = await bcrypt.hash('NewPass123!', 10);
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'test@example.com',
          otp: '1234',
          newPassword: hashedNewPassword,
        })
        .expect(202);

      expect(response.body.message).toBe('Password reset successfully');
    });

    it('should return 401 for invalid OTP', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'oldpassword',
        fullname: 'Test User',
        type: 'student',
        otp: '1234',
        otpExpire: new Date(Date.now() + 10 * 60 * 1000),
      });

      const hashedNewPassword = await bcrypt.hash('NewPass123!', 10);
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'test@example.com',
          otp: '9999', // Wrong OTP
          newPassword: hashedNewPassword,
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired OTP');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          email: 'test@example.com',
          // Missing otp and newPassword
        })
        .expect(400);

      expect(response.body.error).toBe('Email, OTP, and newPassword are required');
    });
  });
});

