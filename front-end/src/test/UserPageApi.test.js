import { getDegreeCredits, getUserTimelines, deleteTimelineById, buildTranscriptData } from '../api/UserPageApi';

describe('UserPageApi', () => {
  let fetchMock;
  let consoleErrSpy;

  // helpers to build fetch-like responses
  const ok = (data) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    });

  const notOk = (data) =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve(data),
    });

  beforeEach(() => {
    // provide a fetch mock (no spyOn; it might not exist)
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // clean up our global
    delete global.fetch;
    consoleErrSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('getDegreeCredits', () => {
    test('returns credits when API succeeds', async () => {
      fetchMock.mockImplementation(() => ok(128));

      const res = await getDegreeCredits('deg-1');
      expect(res).toBe(128);

      // URL may include REACT_APP_SERVER; just assert the path
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/degree/getCredits'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ degreeId: 'deg-1' }),
        }),
      );
    });

    test('returns null and logs when API fails', async () => {
      fetchMock.mockImplementation(() => notOk({ message: 'boom' }));

      const res = await getDegreeCredits('deg-2');
      expect(res).toBeNull();
      expect(consoleErrSpy).toHaveBeenCalled();
    });
  });

  describe('getUserTimelines', () => {
    test('returns timelines sorted by last_modified desc', async () => {
      const payload = [
        { id: 'b', name: 'Plan B', last_modified: '2025-10-01T10:00:00Z' },
        { id: 'a', name: 'Plan A', last_modified: '2025-10-02T10:00:00Z' },
      ];
      fetchMock.mockImplementation(() => ok(payload));

      const res = await getUserTimelines('u-1');
      expect(res.map((t) => t.id)).toEqual(['a', 'b']);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/timeline/getAll'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'u-1' }),
        }),
      );
    });

    test('returns [] when API returns non-array', async () => {
      fetchMock.mockImplementation(() => ok({ not: 'array' }));

      const res = await getUserTimelines('u-2');
      expect(res).toEqual([]);
    });

    test('returns [] and logs when API fails', async () => {
      fetchMock.mockImplementation(() => notOk({ message: 'nope' }));

      const res = await getUserTimelines('u-3');
      expect(res).toEqual([]);
      expect(consoleErrSpy).toHaveBeenCalled();
    });
  });

  describe('deleteTimelineById', () => {
    test('resolves (no throw) on success', async () => {
      fetchMock.mockImplementation(() => ok({}));

      await expect(deleteTimelineById('t-1')).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/timeline/delete'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeline_id: 't-1' }),
        }),
      );
    });

    test('throws on failure and logs', async () => {
      fetchMock.mockImplementation(() => notOk({ message: 'bad' }));

      await expect(deleteTimelineById('t-2')).rejects.toBeInstanceOf(Error);
      expect(consoleErrSpy).toHaveBeenCalled();
    });
  });

  describe('buildTranscriptData', () => {
    test('maps items into transcript format', () => {
      const items = [
        { season: 'Fall', year: '2025', courses: ['C1'] },
        { season: 'Spring', year: '2026', courses: [] },
      ];
      expect(buildTranscriptData(items)).toEqual([
        { term: 'Fall 2025', courses: ['C1'], grade: 'A' },
        { term: 'Spring 2026', courses: [], grade: 'A' },
      ]);
    });

    test('handles empty/undefined', () => {
      expect(buildTranscriptData()).toEqual([]);
      expect(buildTranscriptData([])).toEqual([]);
    });
  });
});
