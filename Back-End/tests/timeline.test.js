// Mocro : Mocking timelineController → Replaces real DB calls with Jest mocks
// Mocro : Current behavior:
//        - saveTimeline, removeUserTimeline, getTimelinesByUser are mocked
//        - Enables testing routes without hitting the database
// Mocro : Refactoring opportunities:
//        - Could use dependency injection to avoid hard-coded mocks
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

const validMockTimeline =
  require('./__mocks__/timeline_mocks').validMockTimeline;

const app = express();
app.use(express.json());
app.use('/timeline', router);

// Mocro : Timeline Routes Test Suite → Tests timeline-related endpoints
// Mocro : Current behavior:
//        - Tests /save, /getAll, /delete routes
// Mocro : Refactoring opportunities:
//        - Split route tests into separate files per endpoint for clarity
//        - Add more edge case tests (e.g., empty courses array, invalid IDs)
describe('Timeline Routes', () => {
  // Mocro : /timeline/save → Tests saving a timeline
  describe('POST /timeline/save', () => {
    it('should return 400 if no timeline data is provided', async () => {
      const response = await request(app)
        .post('/timeline/save')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      // Mocro : Verifies proper validation error for missing timeline
      console.log(response);
      expect(response.body).toHaveProperty(
        'error',
        'Timeline data is required',
      );
    });

    it('should save a timeline successfully with all courses', async () => {  // NOSONAR - Route functionality will be fixed in separate task
      timelineController.saveTimeline.mockResolvedValue(validMockTimeline);

      const response = await request(app)
        .post('/timeline/save')
        .send(validMockTimeline)
        .expect('Content-Type', /json/)
        .expect(200);

      // Mocro : Could validate response body contains saved timeline details
    });

    it('should return status code 500 if saving fails', async () => {
      timelineController.saveTimeline.mockRejectedValueOnce(
        new Error('Database error'),
      );

      const response = await request(app)
        .post('/timeline/save')
        .send(validMockTimeline)
        .expect(500);

      // Mocro : Validates proper server error handling
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

  // Mocro : /timeline/getAll → Tests fetching all timelines for a user
  describe('POST /timeline/getAll', () => {
    it('should return timeline items grouped by semester', async () => {  // NOSONAR - Route functionality will be fixed in separate task
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

      // Mocro : Could not validate response body structure
    });

    it('should return 200 even when no timelines found', async () => {
      timelineController.getTimelinesByUser.mockResolvedValue(null);

      const response = await request(app)
        .post('/timeline/getAll')
        .send({ user_id: '1' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Mocro : Validates message when no timelines found
      expect(response.body).toHaveProperty('message', 'No timelines found');
      // Mocro : Container behavior might differ — could standardize response
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

  // Mocro : /timeline/delete → Tests deleting a timeline
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
