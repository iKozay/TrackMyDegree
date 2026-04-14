const axios = require('axios');
const pythonUtilsApi = require('../utils/pythonUtilsApi');
const Buffer = require('node:buffer').Buffer;

// Mocks
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock('../lib/redisClient', () => ({
  get: jest.fn(),
}));

const redisClient = require('../lib/redisClient');

describe('pythonUtilsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseDegree', () => {
    test('Scrape degree successfully', async () => {
      const mockResponse = {
        data: {
          degree: 'Bachelor of Software Engineering',
          course_pool: [],
          courses: [],
        },
      };
      axios.get.mockResolvedValue(mockResponse);
      const result = await pythonUtilsApi.parseDegree('valid_url');
      expect(result).toEqual(mockResponse.data);
    });

    test('Fail to scrape degree', async () => {
      const mockError = new Error('Network Error');
      axios.get.mockRejectedValue(mockError);
      await expect(pythonUtilsApi.parseDegree('invalid_url')).rejects.toThrow(
        'Failed to parse degree: Network Error',
      );
    });
  });

  describe('parseTranscript', () => {
    test('Parse transcript successfully', async () => {
      const mockResponse = {
        data: {
          programInfo: {},
          semesters: [],
          transferedCourses: [],
        },
      };
      const fileBuffer = Buffer.from('dummy pdf data');

      axios.post.mockResolvedValue(mockResponse);
      const result = await pythonUtilsApi.parseTranscript(fileBuffer);
      expect(result).toEqual(mockResponse.data);
    });
    test('Fail to parse transcript', async () => {
      const mockError = new Error('Network Error');
      axios.post.mockRejectedValue(mockError);
      const fileBuffer = Buffer.from('dummy pdf data');
      await expect(pythonUtilsApi.parseTranscript(fileBuffer)).rejects.toThrow(
        'Failed to parse transcript: Network Error',
      );
    });
  });

  describe('getCourseSchedule', () => {
    test('Get course schedule successfully', async () => {
      const mockCourseData = [{
        courseID: '049701',
        termCode: '2244',
        session: '13W',
        subject: 'COMP',
        catalog: '432',
      }];

      redisClient.get.mockResolvedValue(JSON.stringify(mockCourseData));

      const result = await pythonUtilsApi.getCourseSchedule('COMP', '432');
      expect(result).toEqual(mockCourseData);
    });

    test('Fail to get course schedule when not cached', async () => {
      redisClient.get.mockResolvedValue(null);

      await expect(pythonUtilsApi.getCourseSchedule('COMP', '432')).rejects.toThrow(
        'No schedule found for course COMP432',
      );
    });
  });
});
