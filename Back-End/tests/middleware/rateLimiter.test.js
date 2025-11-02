const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/redisClient', () => ({
  __esModule: true,
  default: {
    isReady: false,
    sendCommand: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(),
    on: jest.fn(),
  },
}));

const {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter,
  signupLimiter,
} = require('../../middleware/rateLimiter');
/*
 * helper function to create an express app with rate limiters applied
 * this ensures each test has a fresh app instance with clean middleware setup
 */
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  app.use('/auth/forgot-password', forgotPasswordLimiter);
  app.use('/auth/reset-password', resetPasswordLimiter);
  app.use('/auth/login', loginLimiter);
  app.use('/auth/signup', signupLimiter);

  app.post('/auth/forgot-password', (req, res) =>
    res.status(200).json({ success: true }),
  );
  app.post('/auth/reset-password', (req, res) =>
    res.status(200).json({ success: true }),
  );
  app.post('/auth/login', (req, res) =>
    res.status(200).json({ success: true }),
  );
  app.post('/auth/signup', (req, res) =>
    res.status(200).json({ success: true }),
  );

  return app;
};
/*
 * helper function to test rate limiter behavior
 * this function sends (maxRequests + 1) requests to the specified endpoint
 * and checks that the first maxRequests are successful and the last one is blocked
 */
const testRateLimiter = async (endpoint, maxRequests, expectedMessage) => {
  const app = createTestApp();
  const responses = [];
  for (let i = 0; i < maxRequests + 1; i++) {
    responses.push(
      await request(app).post(endpoint).send({ email: 'test@example.com' }),
    );
  }
  for (let i = 0; i < maxRequests; i++) {
    expect(responses[i].status).toBe(200); // success requests
  }
  const last = responses[maxRequests];
  expect(last.status).toBe(429); // blocked
  expect(last.body.error).toBe(expectedMessage); // message
};

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    // clear rate limiter stores before each test
    [
      forgotPasswordLimiter,
      resetPasswordLimiter,
      loginLimiter,
      signupLimiter,
    ].forEach((limiter) => {
      const store = limiter.store;
      if (store?.hits) store.hits.clear();
    });
  });

  it('forgotPasswordLimiter allows 5 requests then blocks', async () => {
    expect.assertions(8);
    await testRateLimiter(
      '/auth/forgot-password',
      5,
      'Too many password reset attempts. Try again later.',
    );
    expect(true).toBe(true); // to account for the assertions inside testRateLimiter
  });

  it('resetPasswordLimiter allows 3 requests then blocks', async () => {
    expect.assertions(6);
    await testRateLimiter(
      '/auth/reset-password',
      3,
      'Too many reset attempts. Try again later.',
    );
    expect(true).toBe(true); // to account for the assertions inside testRateLimiter
  });

  it('loginLimiter allows 5 requests then blocks', async () => {
    expect.assertions(8);
    await testRateLimiter(
      '/auth/login',
      5,
      'Too many login attempts. Try again later.',
    );
    expect(true).toBe(true); // to account for the assertions inside testRateLimiter
  });

  it('signupLimiter allows 5 requests then blocks', async () => {
    expect.assertions(8);
    await testRateLimiter(
      '/auth/signup',
      5,
      'Too many signup attempts. Try again later.',
    );
    expect(true).toBe(true); // to account for the assertions inside testRateLimiter
  });
});
