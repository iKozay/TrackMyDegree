// workers/queue.test.js

const { Buffer } = require('node:buffer');

let workerProcessor;

// ---- Mocks ----
jest.mock('bullmq', () => {
  const mockQueue = jest.fn();
  const mockWorker = jest.fn((name, processor, options) => {
    workerProcessor = processor; // capture the processor fn passed to new Worker()
    return {};
  });

  return {
    Queue: mockQueue,
    Worker: mockWorker,
    Job: jest.fn(),
  };
});

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('../services/timeline/timelineService', () => ({
  buildTimeline: jest.fn(),
}));

jest.mock('../lib/cache', () => ({
  cacheJobResult: jest.fn(),
}));

// Import AFTER mocks so they take effect
require('../workers/queue'); // adjust path if test file is elsewhere

const { readFile, unlink } = require('node:fs/promises');
const { buildTimeline } = require('../services/timeline/timelineService');
const { cacheJobResult } = require('../lib/cache');

describe('courseProcessorWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('processes a file job: reads file, builds timeline, caches result, deletes file', async () => {
    const fileBuffer = Buffer.from('fake-file-content');
    readFile.mockResolvedValueOnce(fileBuffer);
    buildTimeline.mockResolvedValueOnce({ timeline: ['a', 'b'] });
    cacheJobResult.mockResolvedValueOnce(undefined);
    unlink.mockResolvedValueOnce(undefined);

    const job = {
      data: {
        jobId: 'job-file-123',
        kind: 'file',
        filePath: '/tmp/job-file-123.pdf',
      },
    };

    await workerProcessor(job);

    expect(readFile).toHaveBeenCalledWith('/tmp/job-file-123.pdf');
    expect(buildTimeline).toHaveBeenCalledWith({
      type: 'file',
      data: fileBuffer,
    });
    expect(cacheJobResult).toHaveBeenCalledWith('job-file-123', {
      payload: { status: 'done', data: { timeline: ['a', 'b'] } },
    });
    expect(unlink).toHaveBeenCalledWith('/tmp/job-file-123.pdf');
  });

  test('processes a body job: builds from form body, caches result, does not delete file', async () => {
    buildTimeline.mockResolvedValueOnce({ timeline: ['x', 'y'] });
    cacheJobResult.mockResolvedValueOnce(undefined);

    const job = {
      data: {
        jobId: 'job-body-456',
        kind: 'body',
        body: { foo: 'bar' },
      },
    };

    await workerProcessor(job);

    expect(readFile).not.toHaveBeenCalled();
    expect(buildTimeline).toHaveBeenCalledWith({
      type: 'form',
      data: { foo: 'bar' },
    });
    expect(cacheJobResult).toHaveBeenCalledWith('job-body-456', {
      payload: { status: 'done', data: { timeline: ['x', 'y'] } },
    });
    expect(unlink).not.toHaveBeenCalled();
  });

  test('still deletes file in finally when processing throws', async () => {
    readFile.mockResolvedValueOnce(Buffer.from('bad-file'));
    buildTimeline.mockRejectedValueOnce(new Error('processing failed'));
    unlink.mockResolvedValueOnce(undefined);

    const job = {
      data: {
        jobId: 'job-error-999',
        kind: 'file',
        filePath: '/tmp/job-error-999.pdf',
      },
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(workerProcessor(job)).rejects.toThrow('processing failed');

    // unlink should still be called from finally
    expect(unlink).toHaveBeenCalledWith('/tmp/job-error-999.pdf');

    // cacheJobResult shouldn't be called because processing failed
    expect(cacheJobResult).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
