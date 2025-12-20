const axios = require('axios');
const Sentry = require('@sentry/node');
const sectionController = require('../controllers/sectionController').default;
const { Buffer } = require('node:buffer');

jest.mock('axios', () => ({
  get: jest.fn(),
  isAxiosError: jest.fn(),
}));

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('sectionController', () => {
  let authHeader;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SCHEDULE_USER = 'testUser';
    process.env.SCHEDULE_PASS = 'testPass';
    authHeader =
      'Basic ' +
      Buffer.from(
        `${process.env.SCHEDULE_USER}:${process.env.SCHEDULE_PASS}`,
      ).toString('base64');
  });

  describe('getCourseSchedule', () => {
    it('should return course schedule data when API call succeeds', async () => {
      const mockResponse = {
        data: { schedule: 'mock schedule data' },
        status: 200,
      };

      axios.get.mockResolvedValueOnce(mockResponse);

      const result = await sectionController.getCourseSchedule('SOEN', '490');

      expect(axios.get).toHaveBeenCalledWith(
        'https://opendata.concordia.ca/API/v1/course/schedule/filter/*/SOEN/490',
        {
          headers: {
            Authorization: authHeader,
            Accept: 'application/json',
          },
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error and log to Sentry when API call fails', async () => {
      const mockError = new Error('Network error');
      axios.get.mockRejectedValueOnce(mockError);

      await expect(
        sectionController.getCourseSchedule('SOEN', '490'),
      ).rejects.toThrow('Failed to fetch course schedule.');

      expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
    });

    it('should handle axios-specific errors with detailed logging', async () => {
      const mockAxiosError = {
        response: {
          status: 404,
          data: { error: 'Not found' },
          headers: { 'content-type': 'application/json' },
        },
        isAxiosError: true,
      };

      axios.get.mockRejectedValueOnce(mockAxiosError);
      axios.isAxiosError.mockReturnValueOnce(true);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        sectionController.getCourseSchedule('SOEN', '490'),
      ).rejects.toThrow('Failed to fetch course schedule.');

      expect(consoleSpy).toHaveBeenCalledWith('External API Error:', {
        status: 404,
        data: { error: 'Not found' },
        headers: { 'content-type': 'application/json' },
      });

      consoleSpy.mockRestore();
    });
  });
});
