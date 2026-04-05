const { csrfMiddleware } = require("../../middleware/csurfMiddleware");
const csurf = require("csurf");

jest.mock("csurf");

describe("csrfMiddleware", () => {
  let req;
  let res;
  let next;
  let mockCsrfProtection;

  beforeEach(() => {
    req = {
      method: "GET",
      csrfToken: jest.fn(() => "mock-csrf-token"),
    };

    res = {
      setHeader: jest.fn(),
      getHeaders: jest.fn(() => ({})),
    };

    next = jest.fn();

    mockCsrfProtection = jest.fn((req, res, callback) => {
      callback();
    });

    csurf.mockReturnValue(mockCsrfProtection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should attach csrf token header for safe GET requests", () => {
    csrfMiddleware(req, res, next);

    expect(mockCsrfProtection).toHaveBeenCalled();
    expect(req.csrfToken).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      "X-CSRF-Token",
      "mock-csrf-token"
    );
    expect(next).toHaveBeenCalled();
  });

  it("should skip setting header if csrfToken is unavailable", () => {
    req.csrfToken = undefined;

    csrfMiddleware(req, res, next);

    expect(mockCsrfProtection).toHaveBeenCalled();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should pass errors from csrfProtection on safe methods", () => {
    const error = new Error("CSRF failure");

    mockCsrfProtection.mockImplementation((req, res, callback) => {
      callback(error);
    });

    csrfMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it("should enforce csrfProtection directly for unsafe POST requests", () => {
    req.method = "POST";

    csrfMiddleware(req, res, next);

    expect(mockCsrfProtection).toHaveBeenCalledWith(req, res, next);
  });

  it("should treat OPTIONS as safe and attach token", () => {
    req.method = "OPTIONS";

    csrfMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      "X-CSRF-Token",
      "mock-csrf-token"
    );
    expect(next).toHaveBeenCalled();
  });
});