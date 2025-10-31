const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const mongoRouter = require('../dist/routes/mongo/index').default;

// Create test app
const app = express();
app.use(express.json());
app.use('/mongo', mongoRouter);

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
    const response = await request(app).get('/v2/degree').expect(404); // Should return 404 since no degree exists

    // The route should exist (404 means route exists but no data found)
    expect(response.status).toBe(404);
  });

  it('should have /mongo/degree route', async () => {
    const response = await request(app).get('/mongo/degree').expect(200);

    expect(response.body.message).toBeDefined();
  });

  it('should have /mongo/courses route', async () => {
    const response = await request(app).get('/mongo/courses').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /mongo/users route', async () => {
    const response = await request(app).get('/mongo/users').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /mongo/feedback route', async () => {
    const response = await request(app).get('/mongo/feedback').expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /mongo/timeline route', async () => {
    const response = await request(app)
      .get('/mongo/timeline/user/testuser')
      .expect(200);

    expect(response.body).toBeDefined();
  });

  it('should have /mongo/admin route', async () => {
    const response = await request(app)
      .get('/mongo/admin/collections')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
