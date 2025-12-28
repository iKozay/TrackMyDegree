// controllers/uploadController.test.js

// ---- Mock the queue ----
const mockQueueAdd = jest.fn();

jest.mock('../workers/queue', () => ({
  queue: {
    add: mockQueueAdd,
  },
}));

// Import AFTER mocks
const { uploadController } = require('../controllers/uploadController');

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('uploadController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 if jobId is missing', async () => {
    const req = {
      // no jobId
      file: undefined,
      body: {},
    };
    const res = createMockResponse();

    await uploadController(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Job ID missing. Did assignJobId run?',
    });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  test('enqueues file job when file is present', async () => {
    const req = {
      jobId: 'job-file-123',
      file: { path: '/tmp/file-123.pdf' },
      body: {}, // ignored because file exists
    };
    const res = createMockResponse();

    mockQueueAdd.mockResolvedValueOnce(undefined);

    await uploadController(req, res, jest.fn());

    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'processData',
      {
        jobId: 'job-file-123',
        kind: 'file',
        filePath: '/tmp/file-123.pdf',
      },
      {
        removeOnComplete: true,
        removeOnFail: { age: 86400 },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      jobId: 'job-file-123',
      status: 'processing',
      message: 'Job accepted',
    });
  });

  test('enqueues body job when no file but body is present', async () => {
    const req = {
      jobId: 'job-body-456',
      file: undefined,
      body: { foo: 'bar' },
    };
    const res = createMockResponse();

    mockQueueAdd.mockResolvedValueOnce(undefined);

    await uploadController(req, res, jest.fn());

    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'processData',
      {
        jobId: 'job-body-456',
        kind: 'body',
        body: { foo: 'bar' },
      },
      {
        removeOnComplete: true,
        removeOnFail: { age: 86400 },
      },
    );

    expect(res.json).toHaveBeenCalledWith({
      jobId: 'job-body-456',
      status: 'processing',
      message: 'Job accepted',
    });
  });

  test('returns 400 if neither file nor non-empty body is provided', async () => {
    const req = {
      jobId: 'job-empty-789',
      file: undefined,
      body: {}, // empty
    };
    const res = createMockResponse();

    await uploadController(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'No file or body provided in the request',
    });
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  test('returns 500 if queue.add throws', async () => {
    const req = {
      jobId: 'job-error-999',
      file: { path: '/tmp/file-error.pdf' },
      body: {},
    };
    const res = createMockResponse();

    mockQueueAdd.mockRejectedValueOnce(new Error('queue failure'));

    await uploadController(req, res, jest.fn());

    expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error creating job',
    });
  });
});
