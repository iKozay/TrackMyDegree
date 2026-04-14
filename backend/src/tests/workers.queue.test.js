// workers/courseProcessor.test.js

const { Buffer } = require('node:buffer');

let workerProcessor;

// ---- Mocks ----
jest.mock('bullmq', () => {
  const mockQueue = jest.fn();
  const mockWorker = jest.fn((name, processor, options) => {
    workerProcessor = processor; // capture the processor fn passed to new Worker()
    return {
      on: jest.fn(), // mock the 'on' method for event handling
      close: jest.fn(), // mock the 'close' method for cleanup
    };
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

jest.mock('../services/timeline/timelineBuilder', () => ({
  buildTimeline: jest.fn(),
  buildTimelineFromDB: jest.fn(),
}));

jest.mock('../lib/cache', () => ({
  cacheJobResult: jest.fn(),
}));

// Import AFTER mocks so they take effect
require('../workers/courseProcessor');

const { readFile, unlink } = require('node:fs/promises');
const { buildTimeline } = require('../services/timeline/timelineBuilder');
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
      attemptsMade: 0,
      opts: { attempts: 3 },
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
      attemptsMade: 0,
      opts: { attempts: 3 },
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

  test('processes a timelineData job: builds from DB, caches result', async () => {
    const { buildTimelineFromDB } = require('../services/timeline/timelineBuilder');
    buildTimelineFromDB.mockResolvedValueOnce({ timeline: ['db', 'data'] });
    cacheJobResult.mockResolvedValueOnce(undefined);

    const job = {
      data: {
        jobId: 'job-timeline-789',
        kind: 'timelineData',
        timelineId: 'timeline-123',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    await workerProcessor(job);

    expect(buildTimelineFromDB).toHaveBeenCalledWith('timeline-123');
    expect(cacheJobResult).toHaveBeenCalledWith('job-timeline-789', {
      payload: { status: 'done', data: { timeline: ['db', 'data'] } },
    });
    expect(unlink).not.toHaveBeenCalled();
  });

  test('does NOT delete file on non-last failed attempt so retries can read it', async () => {
    readFile.mockResolvedValueOnce(Buffer.from('bad-file'));
    buildTimeline.mockRejectedValueOnce(new Error('processing failed'));

    const job = {
      data: {
        jobId: 'job-retry-1',
        kind: 'file',
        filePath: '/tmp/job-retry-1.pdf',
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await expect(workerProcessor(job)).rejects.toThrow('processing failed');

    expect(unlink).not.toHaveBeenCalled();
    expect(cacheJobResult).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  test('deletes file on the last failed attempt to clean up', async () => {
    readFile.mockResolvedValueOnce(Buffer.from('bad-file'));
    buildTimeline.mockRejectedValueOnce(new Error('processing failed'));
    unlink.mockResolvedValueOnce(undefined);

    const job = {
      data: {
        jobId: 'job-last-attempt',
        kind: 'file',
        filePath: '/tmp/job-last-attempt.pdf',
      },
      attemptsMade: 2,
      opts: { attempts: 3 },
    };

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    await expect(workerProcessor(job)).rejects.toThrow('processing failed');

    expect(unlink).toHaveBeenCalledWith('/tmp/job-last-attempt.pdf');

    // ✅ Updated expectation
    expect(cacheJobResult).toHaveBeenCalledWith('job-last-attempt', {
      payload: { status: 'failed', data: null },
    });

    errorSpy.mockRestore();
  });
});
