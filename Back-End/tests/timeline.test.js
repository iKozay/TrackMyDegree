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
const { afterEach } = require('node:test');
const router = require('../dist/routes/timeline').default;
const timelineController =
  require('../dist/controllers/timelineController/timelineController').default;

const validMockTimeline =
  require('./__mocks__/timeline_mocks').validMockTimeline;

const app = express();
app.use(express.json());
app.use('/timeline', router);

describe('Timeline Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('POST /timeline/save', () => {
    // Works in container but not here ?
    it('should return 400 if no timeline data is provided', async () => {
      const response = await request(app)
        .post('/timeline/save')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      console.log(response);
      expect(response.body).toHaveProperty(
        'error',
        'Timeline data is required',
      );
    });

    it('should save a timeline successfully with all courses', async () => {
      timelineController.saveTimeline.mockResolvedValue(validMockTimeline);

      const response = await request(app)
        .post('/timeline/save')
        .send(validMockTimeline)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should return status code 500 if saving fails', async () => {
      timelineController.saveTimeline.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const response = await request(app)
        .post('/timeline/save')
        .send(validMockTimeline)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Could not save timeline');
    });

    it('should return 500 if saved timeline returns null', async () => {
      timelineController.saveTimeline.mockRejectedValueOnce(null);

      const response = await request(app)
        .post('/timeline/save')
        .send(validMockTimeline)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Could not save timeline');
    });
  });

  describe('POST /timeline/getAll', () => {
    it('should return timeline items grouped by semester', async () => {
      const request_body = { user_id: '1' };

      timelineController.getTimelinesByUser.mockResolvedValue([
        'Fall 2024',
        'Winter 2025',
      ]);

      const response = await request(app)
        .post('/timeline/getAll')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(200);
    });

    it('should return 200 even when no timelines found', async () => {
      timelineController.getTimelinesByUser.mockResolvedValue(null);

      const response = await request(app)
        .post('/timeline/getAll')
        .send({ user_id: '1' })
        .expect('Content-Type', /json/)
        .expect(200);
      expect(response.body).toEqual('No timelines found');
      // this fails in the container has to be expect(response.body).toHaveProperty('error', 'No timelines found');
    });

    it('should return 400 when user_id is missing', async () => {
      const response = await request(app)
        .post('/timeline/getAll')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'User ID is required');
    });
  });

  describe('POST /timeline/delete', () => {
    it('should delete timeline item successfully', async () => {
      const request_body = { timeline_id: '1' };
      expected_response = `Timeline with id: ${request_body.timeline_id} deleted successfully`;
      timelineController.removeUserTimeline.mockResolvedValue(
        expected_response,
      );

      const response = await request(app)
        .post('/timeline/delete')
        .send(request_body)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('message', expected_response);
    });

    it('should return 404 when timeline item not found', async () => {
      const invalid_request = { timeline_id: 'nonexistent_item' };

      timelineController.removeUserTimeline.mockResolvedValue(
        `No timeline found with id: ${invalid_request.timeline_id}`,
      );

      const response = await request(app)
        .post('/timeline/delete')
        .send(invalid_request)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty(
        'error',
        `No timeline found with id: nonexistent_item`,
      );
    });

    it('should return 404 when timeline_item_id is missing', async () => {
      const response = await request(app)
        .post('/timeline/delete')
        .send({})
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Timeline ID is required');
    });

    it('should return 404 when timeline controller returns error', async () => {
      timelineController.removeUserTimeline.mockResolvedValue(
        'Error occurred while deleting timeline.',
      );
      const response = await request(app)
        .post('/timeline/delete')
        .send({ timeline_id: '1' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Internal Server Error');
    });

    it('should return 500 when timeline controller triggers error in route function', async () => {
      timelineController.removeUserTimeline.mockRejectedValueOnce(
        new Error('Database error'),
      );
      const response = await request(app)
        .post('/timeline/delete')
        .send({ timeline_id: '1' })
        .expect('Content-Type', /json/)
        .expect(500);

      expect(response.body).toHaveProperty(
        'error',
        'Failed to delete timeline',
      );
    });
  });
});
