const request = require('supertest');
const express = require('express');
const Sentry = require('@sentry/node');

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

// Mock the pythonUtilsApi module
const mockGetCourseSchedule = jest.fn();
jest.mock('@utils/pythonUtilsApi', () => ({
  getCourseSchedule: mockGetCourseSchedule,
}));

const sectionsRoutes = require('../routes/sectionsRoutes').default;

// Create test app
const app = express();
app.use(express.json());
app.use('/section', sectionsRoutes);

const BAD_REQUEST_ERROR = 'Invalid input. Provide subject and course codes.';
const HTTP = {
  OK: 200,
  BAD_REQUEST: 400,
  SERVER_ERR: 500,
};

describe('Sections Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /section/schedule', () => {
    it('should return 200 and course schedule for valid input', async () => {
      const mockResponse = [
        {
          "courseID": "049701",
          "termCode": "2244",
          "session": "13W",
          "subject": "COMP",
          "catalog": "432",
          "section": "W",
          "componentCode": "LEC",
          "componentDescription": "Lecture",
          "classNumber": "6154",
          "classAssociation": "1",
          "courseTitle": "MACHINE LEARNING",
          "topicID": "",
          "topicDescription": "",
          "classStatus": "Active",
          "locationCode": "SGW",
          "instructionModeCode": "P",
          "instructionModeDescription": "In Person",
          "meetingPatternNumber": "1",
          "roomCode": "H937",
          "buildingCode": "H",
          "room": "937",
          "classStartTime": "17.45.00",
          "classEndTime": "20.15.00",
          "mondays": "Y",
          "tuesdays": "N",
          "wednesdays": "N",
          "thursdays": "N",
          "fridays": "N",
          "saturdays": "N",
          "sundays": "N",
          "classStartDate": "13/01/2025",
          "classEndDate": "12/04/2025",
          "career": "Undergraduate",
          "departmentCode": "COMPSOEN",
          "departmentDescription": "Computer Science & Software Engineering",
          "facultyCode": "ENCS",
          "facultyDescription": "Gina Cody School of Engineering & Computer Science",
          "enrollmentCapacity": "110",
          "currentEnrollment": "86",
          "waitlistCapacity": "12",
          "currentWaitlistTotal": "0",
          "hasSeatReserved": ""
        }
      ];
      mockGetCourseSchedule.mockResolvedValueOnce(mockResponse);
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: 'SOEN', catalog: '490' });
      expect(response.status).toBe(HTTP.OK);
      expect(response.body).toEqual(mockResponse);
      expect(mockGetCourseSchedule).toHaveBeenCalledWith('SOEN', '490');
    });

    it('should return 400 for missing subject', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ catalog: '490' });

      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 for missing catalog', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: 'COMP' });

      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 for subject of wrong type', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: { subject: 'SOEN' }, catalog: '490' });
      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 for catalog of wrong type', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: 'COMP', catalog: { code: '490' } });

      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 for empty subject', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: '', catalog: '490' });

      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 400 for empty catalog', async () => {
      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: 'COMP', catalog: '' });

      expect(response.status).toBe(HTTP.BAD_REQUEST);
      expect(response.body).toEqual({
        error: BAD_REQUEST_ERROR,
      });
      expect(mockGetCourseSchedule).not.toHaveBeenCalled();
    });

    it('should return 500 when controller throws error', async () => {
      const mockError = new Error('Controller error');
      mockGetCourseSchedule.mockRejectedValueOnce(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(app)
        .get('/section/schedule')
        .query({ subject: 'COMP', catalog: '490' });

      expect(response.status).toBe(HTTP.SERVER_ERR);
      expect(response.body).toEqual({
        error: 'Error fetching course schedule',
      });
      expect(mockGetCourseSchedule).toHaveBeenCalledWith('COMP', '490');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching course schedule',
        mockError,
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(mockError);

      consoleSpy.mockRestore();
    });
  });
});
