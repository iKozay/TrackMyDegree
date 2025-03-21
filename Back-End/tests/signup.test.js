jest.mock('../dist/controllers/authController/authController', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
    registerUser: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const router = require('../dist/routes/auth').default;
const controller =
  require('../dist/controllers/authController/authController').default;

const url = process.DOCKER_URL || 'host.docker.internal:8000';

const app = express();
app.use(express.json());
app.use('/auth', router);

describe('POST /auth/signup', () => {
  const mockDBResponse = { id: '2d876080-5b77-43ba-969c-09b9d4247131' };

  controller.registerUser.mockResolvedValue(mockDBResponse);

  it('should return a successful signup message and user details', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'example@example.com',
        password: 'pass',
        fullname: 'Random User',
        type: 'student',
        degree: 'CS',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toHaveProperty('id'); // Ensure that the 'id' property is present
    expect(typeof response.body.id).toBe('string'); // Ensure that 'id' is a string

    // Check if the 'id' matches a UUID format
    expect(response.body.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    );
  });

  // Invalid request, missing fields
  it('should return a 500 error message', async () => {
    const response = await request(url)
      .post('/auth/signup')
      .send({
        email: 'example@example.com',
        password: 'pass',
        fullname: 'Random User',
      })
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'Internal server error in /signup',
    );
  });
});
