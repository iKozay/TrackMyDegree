// Set up environment variables
process.env.JWT_ORG_ID = 'test-org-id';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const sessionRoutes = require('../routes/mongo/sessionRoutes').default;
const { User } = require('../models/User');
const jwt = require('jsonwebtoken');
const { userController } = require('../controllers/mondoDBControllers');

// Mock authMiddleware
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    // Bypass auth for testing
    next();
  }),
}));

// Mock jwtService
jest.mock('../services/jwtService', () => {
  const jwt = require('jsonwebtoken');
  const secret = 'test-secret-key';
  
  return {
    jwtService: {
      verifyAccessToken: jest.fn((token) => {
        try {
          return jwt.verify(token, secret);
        } catch {
          return null;
        }
      }),
      generateToken: jest.fn((payload, headers, sessionToken) => {
        return jwt.sign(
          { ...payload, session_token: sessionToken || 'mock-session-token' },
          secret,
          { expiresIn: '1h' }
        );
      }),
      setAccessCookie: jest.fn((token) => ({
        name: 'access_token',
        value: token,
        config: {},
      })),
    },
    getCookieOptions: jest.fn(() => ({})),
  };
});

jest.mock('../Util/Session_Util', () => ({
  refreshSession: jest.fn((token, headers) => 'refreshed-session-token'),
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/session', sessionRoutes);

describe('Session Routes (MongoDB)', () => {
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

  describe('GET /session/refresh', () => {
    it('should return 200 and refresh session with valid token', async () => {
      const testUser = await User.create({
        email: 'test@example.com',
        password: 'hashed',
        fullname: 'Test User',
        type: 'student',
      });

      const { jwtService } = require('../services/jwtService');
      const token = jwt.sign(
        {
          orgId: 'test-org-id',
          userId: testUser._id.toString(),
          id: testUser._id.toString(),
          type: 'student',
          session_token: 'mock-session-token',
        },
        'test-secret-key',
        { expiresIn: '1h' }
      );

      // Mock verifyAccessToken to return the decoded token
      jwtService.verifyAccessToken.mockReturnValueOnce({
        orgId: 'test-org-id',
        userId: testUser._id.toString(),
        id: testUser._id.toString(),
        type: 'student',
        session_token: 'mock-session-token',
      });

      const response = await request(app)
        .get('/session/refresh')
        .set('Cookie', `access_token=${token}`)
        .expect(200);

      // The route returns the user object if found, or a message if not found
      expect(response.body).toBeDefined();
      // If user is found, it returns user object directly; if not, it returns message
      if (response.body.message) {
        expect(response.body.message).toBe('Session refreshed successfully');
      } else {
        expect(response.body._id).toBeDefined();
        expect(response.body.email).toBeDefined();
      }
    });

    it('should return 401 for missing access token', async () => {
      const { jwtService } = require('../services/jwtService');
      jwtService.verifyAccessToken.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/session/refresh')
        .expect(401);

      expect(response.body.error).toBe('Missing access token');
    });

    it('should return 401 for invalid access token', async () => {
      const { jwtService } = require('../services/jwtService');
      jwtService.verifyAccessToken.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/session/refresh')
        .set('Cookie', 'access_token=invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid or expired access token');
    });
  });

  describe('GET /session/destroy', () => {
    it('should return 200 and destroy session', async () => {
      const response = await request(app)
        .get('/session/destroy')
        .expect(200);

      expect(response.body.message).toBe('Session destroyed successfully');
    });
  });
});

