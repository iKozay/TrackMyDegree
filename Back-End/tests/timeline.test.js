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

describe('POST /timeline/getAll', () => {
  it('should return timeline items grouped by semester', async () => {
    timelineController.getTimelinesByUser.mockResolvedValue(['Fall 2024', 'Winter 2025']);
    const response = await request(app).post('/timeline/getAll').send({ user_id: '1' }).expect(200);
  });

  it('should return 200 even when no timelines found', async () => {
    timelineController.getTimelinesByUser.mockResolvedValue(null);
    const response = await request(app).post('/timeline/getAll').send({ user_id: '1' }).expect(200);
    expect(response.body).toHaveProperty('message', 'No timelines found');
  });

  it('should return 400 when user_id is missing', async () => {
    const response = await request(app).post('/timeline/getAll').send({}).expect(400);
    expect(response.body).toHaveProperty('error', 'User ID is required');
  });
});

describe('POST /timeline/delete', () => {
  it('should delete timeline successfully', async () => {
    const request_body = { timeline_id: '1' };
    timelineController.removeUserTimeline.mockResolvedValue(`Timeline with id: 1 deleted successfully`);
    const response = await request(app).post('/timeline/delete').send(request_body).expect(200);
    expect(response.body).toHaveProperty('message', `Timeline with id: 1 deleted successfully`);
  });

  it('should return 404 when timeline item not found', async () => {
    const invalid_request = { timeline_id: 'nonexistent_item' };
    timelineController.removeUserTimeline.mockResolvedValue(`No timeline found with id: nonexistent_item`);
    const response = await request(app).post('/timeline/delete').send(invalid_request).expect(404);
    expect(response.body).toHaveProperty('error', `No timeline found with id: nonexistent_item`);
  });

  it('should return 404 when timeline_item_id is missing', async () => {
    const response = await request(app).post('/timeline/delete').send({}).expect(404);
    expect(response.body).toHaveProperty('error', 'Timeline ID is required');
  });

  it('should return 404 when timeline controller returns error', async () => {
    timelineController.removeUserTimeline.mockResolvedValue('Error occurred while deleting timeline.');
    const response = await request(app).post('/timeline/delete').send({ timeline_id: '1' }).expect(404);
    expect(response.body).toHaveProperty('error', 'Internal Server Error');
  });

  it('should return 500 when timeline controller triggers error in route function', async () => {
    timelineController.removeUserTimeline.mockRejectedValueOnce(new Error('Database error'));
    const response = await request(app).post('/timeline/delete').send({ timeline_id: '1' }).expect(500);
    expect(response.body).toHaveProperty('error', 'Failed to delete timeline');
  });
});
