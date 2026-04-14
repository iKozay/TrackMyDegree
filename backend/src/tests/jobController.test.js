// tests/jobController.test.js
const { BadRequestError, NotFoundError } = require('@utils/errors');

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
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

describe('jobController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getByJobId', () => {
    it('throws BadRequestError if jobId is missing', async () => {
      const req = { params: {} };
      const res = createMockResponse();

      await expect(getByJobId(req, res)).rejects.toThrow(BadRequestError);
      await expect(getByJobId(req, res)).rejects.toThrow('Job ID not provided');
      expect(mockGetJobResult).not.toHaveBeenCalled();
    });

    it('throws NotFoundError if cached result is missing', async () => {
      const req = { params: { jobId: 'job-123' } };
      const res = createMockResponse();
      mockGetJobResult.mockResolvedValueOnce(null);

      await expect(getByJobId(req, res)).rejects.toThrow(NotFoundError);
      await expect(getByJobId(req, res)).rejects.toThrow('Timeline not found');
      expect(mockGetJobResult).toHaveBeenCalledWith('job-123');
    });

    it('returns 200 with jobId, status, and result when cached data exists', async () => {
      const req = { params: { jobId: 'job-456' } };
      const res = createMockResponse();

      const cached = {
        payload: { status: 'done', data: { timeline: ['step1', 'step2'] } },
      };

      mockGetJobResult.mockResolvedValueOnce(cached);

      await getByJobId(req, res);

      expect(mockGetJobResult).toHaveBeenCalledWith('job-456');
      expect(res.json).toHaveBeenCalledWith({
        jobId: 'job-456',
        status: 'done',
        result: { timeline: ['step1', 'step2'] },
      });
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    });

    it('throws error if getJobResult rejects', async () => {
      const req = { params: { jobId: 'job-error' } };
      const res = createMockResponse();

      mockGetJobResult.mockRejectedValueOnce(new Error('redis failure'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(getByJobId(req, res)).rejects.toThrow('redis failure');
      consoleSpy.mockRestore();
    });
  });

  describe('cacheTimelineByJobId', () => {
    it('applies partial update and caches updated timeline', async () => {
      const req = {
        params: { jobId: 'job-123' },
        body: {
          exemptions: ['COMP 248'],
          deficiencies: ['MATH 203'],
          courses: { 'COMP 248': { status: { status: 'completed', semester: 'FALL 2025' } } },
          semesters: [{ term: 'FALL 2025', courses: [{ code: 'COMP 248' }] }],
          timelineName: 'My timeline',
        },
      };
      const res = createMockResponse();

      const cachedTimeline = {
        pools: [
          { _id: 'exemptions', courses: [] },
          { _id: 'deficiencies', courses: [] },
        ],
        courses: { 'COMP 248': { id: 'COMP 248', status: { status: 'incomplete', semester: null } } },
        semesters: [],
        timelineName: 'Old name',
      };

      mockGetJobResult.mockResolvedValueOnce({ payload: { status: 'done', data: cachedTimeline } });

      await cacheTimelineByJobId(req, res);

      expect(cachedTimeline.pools.find(p => p._id === 'exemptions').courses).toEqual(['COMP 248']);
      expect(cachedTimeline.pools.find(p => p._id === 'deficiencies').courses).toEqual(['MATH 203']);
      expect(cachedTimeline.courses['COMP 248'].status).toEqual({ status: 'completed', semester: 'FALL 2025' });
      expect(cachedTimeline.semesters).toEqual(req.body.semesters);
      expect(cachedTimeline.timelineName).toBe('My timeline');
      expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', { payload: { status: 'done', data: cachedTimeline } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Timeline updated successfully' });
    });

    it('does not update timeline name when not provided', async () => {
      const req = {
        params: { jobId: 'job-123' },
        body: { exemptions: ['COMP 248'] },
      };
      const res = createMockResponse();

      const cachedTimeline = {
        pools: [{ _id: 'exemptions', courses: [] }, { _id: 'deficiencies', courses: [] }],
        courses: {},
        semesters: [],
        timelineName: 'Original timeline name',
      };

      mockGetJobResult.mockResolvedValueOnce({ payload: { status: 'done', data: cachedTimeline } });

      await cacheTimelineByJobId(req, res);

      expect(cachedTimeline.timelineName).toBe('Original timeline name');
      expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', { payload: { status: 'done', data: cachedTimeline } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Timeline updated successfully' });
    });

    it('handles explicit null timelineName', async () => {
      const req = {
        params: { jobId: 'job-123' },
        body: { exemptions: ['COMP 248'], timelineName: null },
      };
      const res = createMockResponse();

      const cachedTimeline = {
        pools: [{ _id: 'exemptions', courses: [] }, { _id: 'deficiencies', courses: [] }],
        courses: {},
        semesters: [],
        timelineName: 'Original timeline name',
      };

      mockGetJobResult.mockResolvedValueOnce({ payload: { status: 'done', data: cachedTimeline } });

      await cacheTimelineByJobId(req, res);

      expect(cachedTimeline.timelineName).toBeNull();
      expect(mockCacheJobResult).toHaveBeenCalledWith('job-123', { payload: { status: 'done', data: cachedTimeline } });
      expect(res.json).toHaveBeenCalledWith({ message: 'Timeline updated successfully' });
    });

    it('throws BadRequestError if jobId is missing', async () => {
      const req = { params: {}, body: {} };
      const res = createMockResponse();
      await expect(cacheTimelineByJobId(req, res)).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError if cached timeline missing', async () => {
      const req = { params: { jobId: 'job-404' }, body: {} };
      const res = createMockResponse();
      mockGetJobResult.mockResolvedValueOnce(null);
      await expect(cacheTimelineByJobId(req, res)).rejects.toThrow(NotFoundError);
    });
  });
});