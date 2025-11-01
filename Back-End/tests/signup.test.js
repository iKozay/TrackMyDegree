jest.mock('../controllers/authController/authController', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
    registerUser: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const router = require('../routes/auth').default;
const authController =
  require('../controllers/authController/authController').default;

const mockUser = require('./__mocks__/user_mocks').mockUser;

const app = express();
app.use(express.json());
app.use('/auth', router);

describe('POST /auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a successful signup message and user details', async () => {
    const mockDBResponse = { id: '2d876080-5b77-43ba-969c-09b9d4247131' };
    authController.registerUser.mockResolvedValueOnce(mockDBResponse);

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

    expect(response.body).toHaveProperty('id');
    expect(typeof response.body.id).toBe('string');
    expect(response.body.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    );
  });

  it('should return 201 and user data on successful signup', async () => {
    authController.registerUser.mockResolvedValueOnce(mockUser);

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'newuser@example.com', password: 'password123' })
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toEqual(mockUser);
  });

  it('should return 400 status and error message when the body is empty', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({})
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty(
      'error',
      'Request body cannot be empty',
    );
  });

  it('should return 500 on server error', async () => {
    authController.registerUser.mockRejectedValueOnce(new Error('DB error'));

    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'newuser@example.com', password: 'password123' })
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'Internal server error in /signup',
    );
  });
});
