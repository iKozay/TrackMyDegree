// controllers/resultController.test.js

// Mock cache module
const mockGetJobResult = jest.fn();
const mockCacheJobResult = jest.fn();

jest.mock('../lib/cache', () => ({
  getJobResult: mockGetJobResult,
  cacheJobResult: mockCacheJobResult,
}));

// Import after mocks
const { getByJobId, cacheTimelineByJobId } = require('../controllers/jobController');

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('getByJobId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 if jobId is missing', async () => {
    const req = {
      params: {}, // no jobId
    };
    const res = createMockResponse();

    await getByJobId(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Job not passed',
    });
    expect(mockGetJobResult).not.toHaveBeenCalled();
  });

  test('returns 410 if cached result is missing/expired', async () => {
    const req = {
      params: { jobId: 'job-123' },
    };
    const res = createMockResponse();

    mockGetJobResult.mockResolvedValueOnce(null);

    await getByJobId(req, res, jest.fn());

    expect(mockGetJobResult).toHaveBeenCalledWith('job-123');
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith({
      error: 'result expired',
    });
  });

  test('returns 200 with jobId, status and result when cached data exists', async () => {
    const req = {
      params: { jobId: 'job-456' },
    };
    const res = createMockResponse();

    const cached = {
      payload: {
        status: 'done',
        data: { timeline: ['step1', 'step2'] },
      },
    };

    mockGetJobResult.mockResolvedValueOnce(cached);

    await getByJobId(req, res, jest.fn());

    expect(mockGetJobResult).toHaveBeenCalledWith('job-456');
    expect(res.json).toHaveBeenCalledWith({
      jobId: 'job-456',
      status: 'done',
      result: { timeline: ['step1', 'step2'] },
    });
  });

  test('returns 500 if getJobResult throws', async () => {
    const req = {
      params: { jobId: 'job-error' },
    };
    const res = createMockResponse();

    mockGetJobResult.mockRejectedValueOnce(new Error('redis failure'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await getByJobId(req, res, jest.fn());

    expect(mockGetJobResult).toHaveBeenCalledWith('job-error');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error fetching result',
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
  it('applies partial update and caches updated timeline', async () => {
      const req = {
          params: { jobId: 'job-123' },
          body: {
              exemptions: ['COMP 248'],
              deficiencies: ['MATH 203'],
              courses: {
                  'COMP 248': {
                      status: { status: 'completed', semester: 'FALL 2025' },
                  },
              },
              semesters: [{ term: 'FALL 2025', courses: [{ code: 'COMP 248' }] }],
              timelineName: 'My timeline',
          },
      };
      const res = createMockResponse();
      const cachedTimeline = {
          pools: [
              { _id: 'Exemptions', courses: [] },
              { _id: 'Deficiencies', courses: [] },
          ],
          courses: {
              'COMP 248': {
                  id: 'COMP 248',
                  status: { status: 'incomplete', semester: null },
              },
          },
          semesters: [],
          timelineName: 'Old name',
      };

      mockGetJobResult.mockResolvedValueOnce({
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        await cacheTimelineByJobId(req, res);

        expect(mockGetJobResult).toHaveBeenCalledWith('job-123');

        // Exemptions / Deficiencies pools updated
        expect(cachedTimeline.pools.find(p => p._id === 'Exemptions').courses)
            .toEqual(['COMP 248']);
        expect(cachedTimeline.pools.find(p => p._id === 'Deficiencies').courses)
            .toEqual(['MATH 203']);

        // Courses merged
        expect(cachedTimeline.courses['COMP 248'].status).toEqual({
            status: 'completed',
            semester: 'FALL 2025',
        });

        // Semesters and name updated
        expect(cachedTimeline.semesters).toEqual(req.body.semesters);
        expect(cachedTimeline.timelineName).toBe('My timeline');

        expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', {
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        expect(res.json).toHaveBeenCalledWith({
            message: 'Timeline updated successfully',
        });
    });
    it('does not update timeline name when not provided', async () => {
        const req = {
            params: { jobId: 'job-123' },
            body: {
                exemptions: ['COMP 248'],
                // timelineName is intentionally omitted
            },
        };
        const res = createMockResponse();

        const cachedTimeline = {
            pools: [
                { _id: 'Exemptions', courses: [] },
                { _id: 'Deficiencies', courses: [] },
            ],
            courses: {},
            semesters: [],
            timelineName: 'Original timeline name',
        };

        mockGetJobResult.mockResolvedValueOnce({
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        await cacheTimelineByJobId(req, res);

        expect(mockGetJobResult).toHaveBeenCalledWith('job-123');

        // Timeline name should remain unchanged
        expect(cachedTimeline.timelineName).toBe('Original timeline name');

        expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', {
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        expect(res.json).toHaveBeenCalledWith({
            message: 'Timeline updated successfully',
        });
    });
    it('handles explicit null timelineName without updating', async () => {
        const req = {
            params: { jobId: 'job-123' },
            body: {
                exemptions: ['COMP 248'],
                timelineName: null,
            },
        };
        const res = createMockResponse();

        const cachedTimeline = {
            pools: [
                { _id: 'Exemptions', courses: [] },
                { _id: 'Deficiencies', courses: [] },
            ],
            courses: {},
            semesters: [],
            timelineName: 'Original timeline name',
        };

        mockGetJobResult.mockResolvedValueOnce({
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        await cacheTimelineByJobId(req, res);

        expect(mockGetJobResult).toHaveBeenCalledWith('job-123');

        // Timeline name should be set to null
        expect(cachedTimeline.timelineName).toBeNull();

        expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', {
            payload: {
                status: 'done',
                data: cachedTimeline,
            },
        });

        expect(res.json).toHaveBeenCalledWith({
            message: 'Timeline updated successfully',
        });
    });
});
