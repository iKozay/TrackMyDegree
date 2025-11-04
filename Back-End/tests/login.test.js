// Set up environment variables
process.env.JWT_ORG_ID = 'test-org-id';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_ALGO = 'aes-256-gcm';

jest.mock('../controllers/authController/authController', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
    registerUser: jest.fn(),
  },
}));

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

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const router = require('../routes/auth').default;
const authController =
  require('../controllers/authController/authController').default;

const mockDBRecord = require('./__mocks__/user_mocks').mockDBRecord;

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', router);

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a successful login message and token', async () => {
    authController.authenticate.mockResolvedValueOnce(mockDBRecord);
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'example@example.com',
        password: 'pass',
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('email', 'example@example.com');
    expect(response.body).toHaveProperty('password');
    expect(response.body).toHaveProperty('fullname', 'Random User');
    expect(response.body).toHaveProperty('type', 'student');
  });

  // Wrong field request
  it('should return 401 status and error message when password is incorrect', async () => {
    authController.authenticate.mockResolvedValueOnce(undefined);
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'example@example.com',
        password: 'adsadhsa',
      })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toHaveProperty(
      'error',
      'Incorrect email or password',
    );
  });

  // Bad request, missing fields
  it('should return 400 status and error message when the body is incorrect', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'example@example.com', // missing password field
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty(
      'error',
      'Email and password are required',
    );
  });
});
