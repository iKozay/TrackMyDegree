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
const { redis } = require('../config/redisClient');

// Mock Redis
jest.mock('../config/redisClient', () => ({
  redis: {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

// Mock JWT service
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
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  // ─────────────────────────────
  // LOGIN TESTS
  // ─────────────────────────────
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
  });

  // ─────────────────────────────
  // SIGNUP TESTS
  // ─────────────────────────────
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
  });

  // ─────────────────────────────
  // FORGOT PASSWORD (send link)
  // ─────────────────────────────
  describe('POST /auth/forgot-password', () => {
    it('should return 202 and send reset link for existing user', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'hashed',
        fullname: 'Test User',
        type: 'student',
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(202);

      expect(response.body.message).toContain('If an account exists');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Request body cannot be empty');
    });
  });

  // ─────────────────────────────
  // RESET PASSWORD (via token)
  // ─────────────────────────────
  describe('POST /auth/reset-password', () => {
    it('should return 202 for valid reset token and reset password', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('OldPass123!', 10),
        fullname: 'Test User',
        type: 'student',
      });

      // Mock valid token in Redis
      redis.get.mockResolvedValueOnce(user.email);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'validtoken',
          newPassword: 'NewPass123!',
        })
        .expect(202);

      expect(response.body.message).toBe('Password reset successfully');
      expect(redis.del).toHaveBeenCalledWith('reset:validtoken');
    });

    it('should return 401 for invalid token', async () => {
      redis.get.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalidtoken',
          newPassword: 'NewPass123!',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired reset link');
    });

    it('should return 400 for missing token or password', async () => {
      const response = await request(app)
        .post('/auth/reset-password')
        .send({}) // Missing token and password
        .expect(400);

      expect(response.body.error).toBe('Token and newPassword are required');
    });
  });
});
