const mockCsrfProtection = jest.fn();

jest.mock('csurf', () => {
  return jest.fn(() => mockCsrfProtection);
});

const { csrfMiddleware } = require('../../middleware/csurfMiddleware');

describe('csrfMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      csrfToken: jest.fn(() => 'mock-csrf-token'),
    };

    res = {
      setHeader: jest.fn(),
      getHeaders: jest.fn(() => ({})),
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should set CSRF token header for safe methods', () => {
    mockCsrfProtection.mockImplementation((req, res, cb) => cb());

    csrfMiddleware(req, res, next);

    expect(mockCsrfProtection).toHaveBeenCalled();
    expect(req.csrfToken).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-CSRF-Token',
      'mock-csrf-token'
    );
    expect(next).toHaveBeenCalled();
  });

  test('should call next with error if csrfProtection fails on safe method', () => {
    const mockError = new Error('CSRF error');

    mockCsrfProtection.mockImplementation((req, res, cb) => cb(mockError));

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(mockError);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  test('should continue even if req.csrfToken throws error', () => {
    req.csrfToken = jest.fn(() => {
      throw new Error('Token generation failed');
    });

    mockCsrfProtection.mockImplementation((req, res, cb) => cb());

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  test('should call csrfProtection directly for unsafe methods', () => {
    req.method = 'POST';

    mockCsrfProtection.mockImplementation((req, res, nextFn) => nextFn());

    csrfMiddleware(req, res, next);

    expect(mockCsrfProtection).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should recognize HEAD and OPTIONS as safe methods', () => {
    ['HEAD', 'OPTIONS'].forEach((method) => {
      req.method = method;

      mockCsrfProtection.mockImplementation((req, res, cb) => cb());

      csrfMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        'mock-csrf-token'
      );
    });
  });
});