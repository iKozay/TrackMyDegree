import * as Sentry from '@sentry/node';
import { notFoundHandler, errorHandler } from '../../middleware/errorHandler';
import { APIError, INTERNAL_SERVER_ERROR } from '../../utils/errors';
import HTTP from '../../utils/httpCodes';
import { NotFoundError } from '@utils/errors';

// Mock dependencies
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

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockReq = {
      originalUrl: '/test/route',
      method: 'GET',
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // --- notFoundHandler ---
  describe('notFoundHandler', () => {
     it('creates NotFoundError and calls next with it', () => {
      notFoundHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);

      const err = mockNext.mock.calls[0][0];

      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.message).toBe(`Route ${mockReq.originalUrl} not found`);
    });
  });

  // --- errorHandler ---
  describe('errorHandler', () => {
    it('handles APIError (4xx) without sending to Sentry', () => {
      const error = new APIError('Custom API error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).not.toHaveBeenCalled();

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'APIError',
        message: 'Custom API error',
        status: 400,
      });
    });

    it('handles generic error (5xx) and sends to Sentry', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);

      expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'InternalServerError',
        message: INTERNAL_SERVER_ERROR,
        status: HTTP.SERVER_ERR,
      });
    });

    it('handles unknown error object (treated as 5xx)', () => {
      const error = { foo: 'bar' };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(error);

      expect(mockStatus).toHaveBeenCalledWith(HTTP.SERVER_ERR);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'InternalServerError',
        message: INTERNAL_SERVER_ERROR,
        status: HTTP.SERVER_ERR,
      });
    });

    it('does not send 403 APIError to Sentry', () => {
      const error = new APIError('Forbidden', 403);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(Sentry.captureException).not.toHaveBeenCalled();

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'APIError',
        message: 'Forbidden',
        status: 403,
      });
    });

    it('logs every error to console', () => {
      const error = new Error('Log test');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[${mockReq.method}] ${mockReq.originalUrl} →`,
        error
      );

      consoleSpy.mockRestore();
    });
  });
});