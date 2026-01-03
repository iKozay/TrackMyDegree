// Set up environment variables
process.env.JWT_ORG_ID = 'test-org-id';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../lib/redisClient', () => ({
    __esModule: true,
    default: {
        get: mockRedisGet,
        set: mockRedisSet,
        del: mockRedisDel,
    },
}));

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../routes/authRoutes').default;
const { User } = require('../models/user');
const bcrypt = require('bcryptjs');
const { authController } = require('../controllers/authController');

// Mock Nodemailer (in __mocks__ folder)
jest.mock('nodemailer');

// Mock JWT service
jest.mock('../services/jwtService', () => ({
  jwtService: {
    verifyRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
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

const { jwtService } = require('../services/jwtService');

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

  describe('POST /auth/refresh', () => {
    it('should return 401 if refresh token is missing', async () => {
      const res = await request(app).post('/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing refresh token');
    });

    it('should return 401 if refresh token is invalid or expired', async () => {
      jwtService.verifyRefreshToken.mockReturnValueOnce(null);
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid']);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired refresh token');
    });

    it('should return 401 if user does not exist', async () => {
      jwtService.verifyRefreshToken.mockReturnValueOnce({ userId: 'fakeId' });
      jest
        .spyOn(authController, 'getUserById')
        .mockResolvedValueOnce(undefined);

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=valid']);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('User does not exist');
    });

    it('should refresh tokens and return user successfully', async () => {
      const user = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        password: 'hashed',
        type: 'student',
      });

      jwtService.verifyRefreshToken.mockReturnValueOnce({ userId: user._id });
      jest.spyOn(authController, 'getUserById').mockResolvedValueOnce({
        _id: user._id.toString(),
        email: user.email,
        fullname: user.fullname,
        type: user.type,
        password: '',
      });

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=valid']);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.role).toBe('student');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear cookies and return 200 with message', async () => {
      const res = await request(app).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');
      const cookies = res.headers['set-cookie'].join(' ');
      expect(cookies).toContain('access_token=;');
      expect(cookies).toContain('refresh_token=;');
    });
  });

  // ─────────────────────────────
  // ME TESTS (GET CURRENT USER)
  // ─────────────────────────────
  describe('GET /auth/me', () => {
    it('should return 401 if access token is missing', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing access token');
    });

    it('should return 401 if access token is invalid or expired', async () => {
      jwtService.verifyAccessToken.mockReturnValueOnce(null);
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', ['access_token=invalid']);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired access token');
    });

    it('should return 401 if user does not exist', async () => {
      jwtService.verifyAccessToken.mockReturnValueOnce({ userId: 'fakeId' });
      jest
        .spyOn(authController, 'getUserById')
        .mockResolvedValueOnce(undefined);

      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', ['access_token=valid']);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('User does not exist');
    });

    it('should return user data successfully with valid access token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        fullname: 'Test User',
        password: 'hashed',
        type: 'student',
      });

      jwtService.verifyAccessToken.mockReturnValueOnce({ userId: user._id });
      jest.spyOn(authController, 'getUserById').mockResolvedValueOnce({
        _id: user._id.toString(),
        email: user.email,
        fullname: user.fullname,
        type: user.type,
        password: '',
      });

      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', ['access_token=valid']);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.role).toBe('student');
      expect(res.body.token).toBe('valid');
    });
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
        user: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'student',
        },
        token: 'mock-token'
      });
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
          name: 'New User',
          type: 'student',
        })
        .expect(201);

      expect(response.body.user.id).toBeDefined();
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
          name: 'Duplicate User',
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
          // Missing password, name, type
        })
        .expect(400);

      expect(response.body.error).toBe(
        'Email, password, fullname, and type are required',
      );
    });

    it('should return 400 for missing required fields when invalid type provided', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!',
          // Missing name field
        })
        .expect(400);

      expect(response.body.error).toBe('Email, password, fullname, and type are required');
    });
  });

  // ─────────────────────────────
  // FORGOT PASSWORD (send link)
  // ─────────────────────────────
  describe('POST /auth/forgot-password', () => {
    it('should return 202 and send reset link for existing user', async () => {
      process.env.FRONTEND_URL = 'https://frontend.com';
      await User.create({
        email: 'test@example.com',
        password: 'hashed',
        fullname: 'Test User',
        type: 'student',
      });

      mockRedisSet.mockResolvedValueOnce();

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(202);

      expect(response.body.message).toContain(
        'If the email exists, a reset link has been sent.',
      );
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
      mockRedisGet.mockResolvedValueOnce(user.email);
      mockRedisDel.mockResolvedValueOnce();

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          resetToken: 'validtoken',
          newPassword: 'NewPass123!',
        })
        .expect(202);

      expect(response.body.message).toBe('Password reset successfully');
      expect(mockRedisDel).toHaveBeenCalledWith('reset:validtoken');
    });

    it('should return 401 for invalid token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: await bcrypt.hash('OldPass123!', 10),
        fullname: 'Test User',
        type: 'student',
      });

      mockRedisGet.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          resetToken: 'invalidtoken',
          newPassword: 'NewPass123!',
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired reset link');
    });

      it('should return 400 for missing resetToken', async () => {
          const response = await request(app)
              .post('/auth/reset-password')
              .send({
                  newPassword: 'NewPass123!',
              })
              .expect(400);

          expect(response.body.error).toBe('Token and newPassword are required');
      });

      it('should return 400 for missing newPassword', async () => {
          const response = await request(app)
              .post('/auth/reset-password')
              .send({
                  resetToken: 'validtoken',
              })
              .expect(400);

          expect(response.body.error).toBe('Token and newPassword are required');
      });

      it('should return 400 for empty request body', async () => {
          const response = await request(app)
              .post('/auth/reset-password')
              .send({})
              .expect(400);

          expect(response.body.error).toBe('Token and newPassword are required');
      });
  });
});
