import { renderHook, act } from '@testing-library/react';
import useCourses from '../../pages/CourseListPage/hooks/useCourses';
import { CourseListPageError } from '../../middleware/SentryErrors';

// Mock Sentry error class
jest.mock('../../middleware/SentryErrors', () => ({
  CourseListPageError: jest.fn().mockImplementation((msg) => ({
    name: 'CourseListPageError',
    message: msg,
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useCourses Hook', () => {
  const SERVER_URL = 'http://localhost:5000';
  const mockCourses = [
    { id: 1, name: 'ENCS 282' },
    { id: 2, name: 'COMP 248' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_SERVER = SERVER_URL;
  });


  // FETCH COURSES BY DEGREE TESTS

  it('should fetch courses by degree successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourses,
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchCoursesByDegree('CS');
    });

    expect(fetch).toHaveBeenCalledWith(
      `${SERVER_URL}/courses/getByDegreeGrouped`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ degree: 'CS' }),
      })
    );

    expect(result.current.courseList).toEqual(mockCourses);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle fetchCoursesByDegree error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to load courses' }),
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchCoursesByDegree('SE');
    });

    expect(result.current.error).toContain('Failed to load courses');
    expect(result.current.courseList).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should not set error when request is aborted', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetch.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchCoursesByDegree('CS');
    });

    expect(result.current.error).toBeNull();
    expect(result.current.courseList).toEqual([]);
  });


  // FETCH ALL COURSES TESTS

  it('should fetch all courses successfully', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourses,
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(fetch).toHaveBeenCalledWith(
      `${SERVER_URL}/courses/getallcourses`,
      expect.objectContaining({ method: 'POST' })
    );

    expect(result.current.courseList).toEqual([
      {
        poolId: 'all',
        poolName: 'All Courses',
        courses: mockCourses,
      },
    ]);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle fetchAllCourses error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(result.current.error).toContain('Server error');
    expect(result.current.courseList).toEqual([]);
  });

  it('should not set error when fetchAllCourses request is aborted', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    fetch.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.courseList).toEqual([]);
  });


  // STATE HANDLING TEST
 
  it('should set loading states correctly', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCourses,
    });

    const { result } = renderHook(() => useCourses());

    // Start fetching
    await act(async () => {
      const promise = result.current.fetchCoursesByDegree('CS');
      expect(result.current.loading).toBe(true);
      await promise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.courseList).toEqual(mockCourses);
  });
});
