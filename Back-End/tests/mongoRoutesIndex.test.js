const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');

// Mock the transcript router that doesn't exist
jest.mock('../../routes/transcript', () => {
  const express = require('express');
  return {
    __esModule: true,
    default: express.Router(),
  };
});

const mongoRouter = require('../routes/mongo/index').default;

// Create test app
const app = express();
app.use(express.json());
app.use('/v2', mongoRouter);

describe('Mongo Routes Index', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should mount all route modules', async () => {
    // Test that routes are accessible
    const response = await request(app).get('/v2/degree').expect(200);

    expect(response.status).toBe(200);
  });

  it('should have /v2/degree route', async () => {
    const response = await request(app).get('/v2/degree').expect(200);

    expect(response.body.message).toBeDefined();
  });

  it('should have /v2/courses route', async () => {
    const response = await request(app).get('/v2/courses').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /v2/users route', async () => {
    const response = await request(app).get('/v2/users').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /v2/feedback route', async () => {
    const response = await request(app).get('/v2/feedback').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /v2/timeline route', async () => {
    const response = await request(app)
      .get('/v2/timeline/user/testuser')
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /v2/admin route', async () => {
    const response = await request(app)
      .get('/v2/admin/collections')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
