/**
 * Integration-style Jest tests for Auth Routes (MongoDB)
 * Updated for secure token-based password reset (no more OTP).
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const app = require('../app'); // assuming your Express app is exported from app.js
const { User } = require('../models/User');

// Mock Redis
jest.mock('ioredis', () => {
  const mRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };
  return jest.fn(() => mRedis);
});

describe('Auth Routes (MongoDB)', () => {
  let mongoServer;
  let redisMock;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const Redis = require('ioredis');
    redisMock = new Redis();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // ─────────────────────────────────────────────
  // USER REGISTRATION
  // ─────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'StrongPass123!',
        })
        .expect(201);

      expect(res.body).toHaveProperty('email', 'newuser@example.com');
    });

    it('should not register an existing user', async () => {
      await User.create({
        email: 'exist@example.com',
        password: await bcrypt.hash('password', 10),
      });

      const res = await request(app)
        .post('/auth/register')
        .send({
          email: 'exist@example.com',
          password: 'password',
        })
        .expect(400);

      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  describe('POST /auth/login', () => {
    it('should login valid user', async () => {
      const hashed = await bcrypt.hash('mypassword', 10);
      await User.create({ email: 'login@example.com', password: hashed });

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'mypassword',
        })
        .expect(200);

      expect(res.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'nopass',
        })
        .expect(401);

      expect(res.body.message).toMatch(/invalid/i);
    });
  });

  // ─────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────
  describe('POST /auth/forgot-password', () => {
    it('should send reset link for existing user', async () => {
      await User.create({ email: 'reset@example.com', password: 'oldpass' });

      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'reset@example.com' })
        .expect(200);

      expect(res.body.message).toMatch(/reset link sent/i);
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should return 404 for non-existing user', async () => {
      const res = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'none@example.com' })
        .expect(404);

      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ─────────────────────────────────────────────
  // RESET PASSWORD (NEW TOKEN-BASED FLOW)
  // ─────────────────────────────────────────────
  describe('POST /auth/reset-password', () => {
    it('should reset valid token and update password', async () => {
      const user = await User.create({
        email: 'resetme@example.com',
        password: await bcrypt.hash('oldpass', 10),
      });

      // Mock Redis returning valid email for token
      redisMock.get.mockResolvedValueOnce(user.email);

      const res = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'validtoken',
          newPassword: 'NewPass123!',
        })
        .expect(202);

      expect(res.body.message).toMatch(/reset successfully/i);

      const updatedUser = await User.findOne({ email: user.email });
      const passwordMatches = await bcrypt.compare('NewPass123!', updatedUser.password);
      expect(passwordMatches).toBe(true);
    });

    it('should fail invalid token', async () => {
      redisMock.get.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'badtoken',
          newPassword: 'newpass',
        })
        .expect(401);

      expect(res.body.message).toMatch(/invalid or expired/i);
    });

    it('should handle DB error gracefully', async () => {
      const orig = User.findOne;
      User.findOne = jest.fn().mockRejectedValueOnce(new Error('DB fail'));

      redisMock.get.mockResolvedValueOnce('reset@example.com');

      const res = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'validtoken',
          newPassword: 'newpass',
        })
        .expect(500);

      expect(res.body.message).toMatch(/internal error/i);
      User.findOne = orig;
    });
  });
});
