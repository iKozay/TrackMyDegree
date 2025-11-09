const createError = require('http-errors');
const Sentry = require('@sentry/node');
const {
  notFoundHandler,
  errorHandler,
} = require('../../middleware/errorHandler');
const HTTP = require('../../utils/httpCodes');

// mock dependencies
jest.mock('http-errors');
jest.mock('@sentry/node');
jest.mock('../../utils/httpCodes', () => ({
  NOT_FOUND: 404,
  SERVER_ERR: 500,
}));

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockJson;
  let mockStatus;
  // reset mocks before each test
  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      originalUrl: '/test/route',
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });
  // tests for notFoundHandler middleware
  describe('notFoundHandler', () => {
    it('creates 404 error and calls next with error', () => {
      const mockError = new Error('Route /test/route not found');
      createError.mockReturnValue(mockError);

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(createError).toHaveBeenCalledWith(
        HTTP.NOT_FOUND,
        'Route /test/route not found',
      );
      expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    it('handles different originalUrl values', () => {
      mockReq.originalUrl = '/api/users/123';
      const mockError = new Error('Route /api/users/123 not found');
      createError.mockReturnValue(mockError);

      notFoundHandler(mockReq, mockRes, mockNext);

      expect(createError).toHaveBeenCalledWith(
        HTTP.NOT_FOUND,
        'Route /api/users/123 not found',
      );
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
  // tests for errorHandler middleware
  describe('errorHandler', () => {
    it('handles error with status and message', () => {
      const error = {
        status: 400,
        message: 'Bad Request',
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Bad Request',
        status: 400,
      });
    });

    it('handles error with statusCode instead of status', () => {
      const error = {
        statusCode: 401,
        message: 'Unauthorized',
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized',
        status: 401,
      });
    });

    it('uses default status 500 when no status is provided', () => {
      const error = {
        message: 'Something went wrong',
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Something went wrong',
        status: HTTP.SERVER_ERR,
      });
    });

    it('uses default message when no message is provided', () => {
      const error = {
        status: 422,
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(422);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        status: 422,
      });
    });

    it('handles error with no status or message (full defaults)', () => {
      const error = {};

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        status: HTTP.SERVER_ERR,
      });
    });

    it('prioritizes status over statusCode when both are present', () => {
      const error = {
        status: 403,
        statusCode: 401,
        message: 'Forbidden',
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Forbidden',
        status: 403,
      });
    });

    it('captures exception in Sentry for all error types', () => {
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});
