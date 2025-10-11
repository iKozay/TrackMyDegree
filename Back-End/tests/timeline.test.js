jest.mock('../dist/controllers/timelineController/timelineController', () => ({
  __esModule: true,
  default: {
    saveTimeline: jest.fn(),
    removeUserTimeline: jest.fn(),
    getTimelinesByUser: jest.fn(),
  },
}));

import request from 'supertest';
import express from 'express';
import router from '../dist/routes/timeline';
import timelineController from '../dist/controllers/timelineController/timelineController';
import { validMockTimeline } from './__mocks__/timeline_mocks';

const app = express();
app.use(express.json());
app.use('/timeline', router);

describe('POST /timeline/save', () => {
  it('should return 400 if no timeline data is provided', async () => {
    const response = await request(app).post('/timeline/save').send({}).expect(400);
    expect(response.body).toHaveProperty('error', 'Timeline data is required');
  });

  it('should save a timeline successfully', async () => {
    timelineController.saveTimeline.mockResolvedValue(validMockTimeline);
    await request(app).post('/timeline/save').send(validMockTimeline).expect(200);
  });

  it('should return 500 if saving fails', async () => {
    timelineController.saveTimeline.mockRejectedValueOnce(new Error('Database error'));
    const response = await request(app).post('/timeline/save').send(validMockTimeline).expect(500);
    expect(response.body).toHaveProperty('error', 'Could not save timeline');
  });

  it('should return 500 if saved timeline returns null', async () => {
    timelineController.saveTimeline.mockRejectedValueOnce(null);
    const response = await request(app).post('/timeline/save').send(validMockTimeline).expect(500);
    expect(response.body).toHaveProperty('error', 'Could not save timeline');
  });
});
