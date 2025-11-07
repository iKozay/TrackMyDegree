jest.mock('../dist/controllers/timelineController/timelineController', () => ({
  __esModule: true,
  default: {
    saveTimeline: jest.fn(),
    removeUserTimeline: jest.fn(),
    getTimelinesByUser: jest.fn(),
  },
}));

const request = require('supertest');
const express = require('express');
const router = require('../dist/routes/timeline').default;
const timelineController =
  require('../dist/controllers/timelineController/timelineController').default;
const { errorHandler } = require('../dist/middleware/errorHandler');

const validMockTimeline =
  require('./__mocks__/timeline_mocks').validMockTimeline;

const app = express();
app.use(express.json());
app.use('/timeline', router);
app.use(errorHandler);

describe('Timeline Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /timeline/', () => {
    it('should return 400 if no timeline data is provided', async () => {
      const response = await request(app)
        .post('/timeline/')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Timeline data is required',
      );
    });

    it('should save a timeline successfully with all courses', async () => {
      timelineController.saveTimeline.mockResolvedValue(
        validMockTimeline.timeline,
      );

      const response = await request(app)
        .post('/timeline/')
        .send(validMockTimeline)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(validMockTimeline.timeline);
      expect(timelineController.saveTimeline).toHaveBeenCalledWith(
        validMockTimeline.timeline,
      );
    });

    it('should return status code 500 if saving fails', async () => {
      timelineController.saveTimeline.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const response = await request(app)
        .post('/timeline/')
        .send(validMockTimeline)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });

    it('should return 500 if saved timeline returns null', async () => {
      timelineController.saveTimeline.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/timeline/')
        .send(validMockTimeline)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Could not save timeline');
    });
  });

  describe('GET /timeline/user/:userId', () => {
    it('should return timeline items grouped by semester', async () => {
      const mockTimelines = ['Fall 2024', 'Winter 2025'];

      timelineController.getTimelinesByUser.mockResolvedValue(mockTimelines);

      const response = await request(app)
        .get('/timeline/user/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockTimelines);
      expect(timelineController.getTimelinesByUser).toHaveBeenCalledWith('1');
    });

    it('should return 200 even when no timelines found', async () => {
      timelineController.getTimelinesByUser.mockResolvedValue(null);

      const response = await request(app)
        .get('/timeline/user/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'No timelines found');
    });

    it('should return 200 when empty array is returned', async () => {
      timelineController.getTimelinesByUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/timeline/user/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'No timelines found');
    });
  });

  describe('DELETE /timeline/:timelineId', () => {
    it('should delete timeline item successfully', async () => {
      const timelineId = '1';
      const expectedResponse = {
        success: true,
        message: `Timeline ${timelineId} deleted successfully`,
      };

      timelineController.removeUserTimeline.mockResolvedValue(expectedResponse);

      const response = await request(app)
        .delete(`/timeline/${timelineId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', expectedResponse.message);
      expect(timelineController.removeUserTimeline).toHaveBeenCalledWith(
        timelineId,
      );
    });

    it('should return 500 when timeline item not found', async () => {
      const timelineId = 'nonexistent_item';
      const expectedResponse = {
        success: false,
        message: `Timeline ${timelineId} not found`,
      };

      timelineController.removeUserTimeline.mockResolvedValue(expectedResponse);

      const response = await request(app)
        .delete(`/timeline/${timelineId}`)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });

    it('should return 500 when timeline controller returns error', async () => {
      const timelineId = '1';
      const expectedResponse = {
        success: false,
        message: 'Error occurred while deleting timeline.',
      };

      timelineController.removeUserTimeline.mockResolvedValue(expectedResponse);

      const response = await request(app)
        .delete(`/timeline/${timelineId}`)
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });

    it('should return 500 when timeline controller triggers error in route function', async () => {
      timelineController.removeUserTimeline.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const response = await request(app).delete('/timeline/1').expect(500);

      expect(response.body).toHaveProperty('error', 'Database error');
    });
  });
});
