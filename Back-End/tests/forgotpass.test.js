// Tests for forgot password and reset password routes

jest.mock('../dist/controllers/authController/authController', () => ({
  __esModule: true,
  default: {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const Database =
  require('../dist/controllers/DBController/DBController').default;
const router = require('../dist/routes/auth').default;
const authController =
  require('../dist/controllers/authController/authController').default;

const resetPassMock = require('./__mocks__/user_mocks').resetPassMock;

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use('/auth', router);

describe('POST /auth/forgot-password', () => {
  it('Should return success message', async () => {
    authController.forgotPassword.mockResolvedValueOnce({
      message: 'OTP has been sent to your email.',
    });

    const response = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: 'newuser@example.com',
      })
      .expect('Content-Type', /json/)
      .expect(202);

    expect(response.body).toHaveProperty(
      'message',
      'OTP has been sent to your email.',
    );
  });

  // Send empty request -> 400
  it('Empty body sent, should return 500 Internal Server error', async () => {
    // Mocked return is empty, which means result in the route function will be null and throw an error -> 500
    authController.forgotPassword.mockResolvedValueOnce(null);
    const response = await request(app)
      .post('/auth/forgot-password')
      .send({})
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'Internal server error in /forgot-password',
    );
  });

  // Send incorrect email -> 500 (server error)
  it('Invalid email sent, should return server error', async () => {
    authController.forgotPassword.mockRejectedValue(new Error('Invalid email'));
    const response = await request(app)
      .post('/auth/forgot-password')
      .send({
        email: 'invalid-email',
      })
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'Internal server error in /forgot-password',
    );
  });
});

describe('POST /auth/reset-password', () => {
  it('Should return success message', async () => {
    authController.resetPassword.mockResolvedValueOnce({
      message: 'Password reset successful.',
    });

    const response = await request(app)
      .post('/auth/reset-password')
      .send(resetPassMock)
      .expect('Content-Type', /json/)
      .expect(202);

    expect(response.body).toHaveProperty(
      'message',
      'Password reset successful.',
    );
  });

  it('Server Error when returning response for password reset -> result is null', async () => {
    authController.resetPassword.mockResolvedValueOnce(null);

    const response = await request(app)
      .post('/auth/reset-password')
      .send({})
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'Internal server error in /reset-password',
    );
  });

  // Send empty request -> 400
});
