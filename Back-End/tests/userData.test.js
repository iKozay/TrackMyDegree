jest.mock('../controllers/userDataController/userDataController', () => ({
  __esModule: true,
  default: {
    getUserData: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const router = require('../routes/userData').default;
const userDataController =
  require('../controllers/userDataController/userDataController').default;

const app = express();
app.use(express.json());
app.use('/data', router);

describe('POST /data/userdata', () => {
  it('should return error if no user ID is provided', async () => {
    const response = await request(app)
      .post('/data/userdata')
      .send({}) // Sending an empty request without ID
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('message', 'User ID is required');
  });

  it('should return error for wrong user id', async () => {
    userDataController.getUserData.mockRejectedValueOnce(
      new Error('User not found'),
    );
    // Simulate an unexpected error in the handler
    const response = await request(app)
      .post('/data/userdata')
      .send({ id: '10543' })
      .expect('Content-Type', /json/)
      .expect(500);

    expect(response.body).toHaveProperty(
      'error',
      'An unexpected error occurred',
    );
  });
});
