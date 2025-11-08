import express from 'express';
import request from 'supertest';

/** lightweight stub factory for child routers */
const makeRouterStub = () => {
  const { Router } = require('express');
  const r = Router();
  // simple ping so we can assert the child route is mounted
  r.get('/__ping', (_req: any, res: any) => res.status(200).send('ok'));
  return { __esModule: true, default: r };
};

/** mock all child routers that mongo/index.ts imports */
jest.mock('../routes/mongo/degreeRoutes',    () => makeRouterStub());
jest.mock('../routes/mongo/courseRoutes',    () => makeRouterStub());
jest.mock('../routes/mongo/userRoutes',      () => makeRouterStub());
jest.mock('../routes/mongo/feedbackRoutes',  () => makeRouterStub());
jest.mock('../routes/mongo/timelineRoutes',  () => makeRouterStub());
jest.mock('../routes/mongo/adminRoutes',     () => makeRouterStub());
jest.mock('../routes/mongo/coursepoolRoutes',() => makeRouterStub());

/** import the router under test AFTER mocks */
import v2Router from '../routes/mongo';

describe('v2 Mongo router', () => {
  const app = express();
  app.use('/v2', v2Router);

  it('GET /v2 returns the welcome payload', async () => {
    const res = await request(app).get('/v2');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Welcome to TrackMyDegree Mongo API v2' });
  });

  it('mounts a couple of child routers (degree, courses)', async () => {
    const res1 = await request(app).get('/v2/degree/__ping');
    expect(res1.status).toBe(200);

    const res2 = await request(app).get('/v2/courses/__ping');
    expect(res2.status).toBe(200);
  });
});
