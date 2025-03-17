const request = require('supertest');

const url = process.DOCKER_URL || 'host.docker.internal:8000';

describe('GET /test-db', () => {
  it('should return a successful database connection message and result', async () => {
    const response = await request(url)
      .get('/test-db')
      .expect('Content-Type', /json/)
      .expect(200); // Expect HTTP 200 status

    expect(response.body).toEqual({
      message: 'Database connected successfully!',
      result: [{ number: 1 }],
    });
  });
});
