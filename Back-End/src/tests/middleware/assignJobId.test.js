// middleware/assignJobId.test.js
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

const { assignJobId } = require('../../middleware/assignJobId'); // adjust path if needed

describe('assignJobId middleware', () => {
  it('should attach a jobId to the request and call next', () => {
    const req = {}; // mock Request object
    const res = {}; // mock Response (not used)
    const next = jest.fn(); // mock next()

    assignJobId(req, res, next);

    // jobId should be set on req
    expect(req.jobId).toBe('mock-uuid-123');

    // next should be called exactly once
    expect(next).toHaveBeenCalledTimes(1);
  });
});
