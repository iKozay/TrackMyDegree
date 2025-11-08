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
  const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:8000';
  const mockCourses = [
    { id: 1, name: 'ENCS 282' },
    { id: 2, name: 'COMP 248' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  // FETCH COURSES BY DEGREE TESTS

  it('should fetch courses by degree successfully', async () => {
    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockCourses,
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchCoursesByDegree('CS');
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/courses/by-degree/CS'),
      expect.objectContaining({
        method: 'GET',
      }),
    );

    expect(result.current.courseList).toEqual(mockCourses);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('should handle fetchCoursesByDegree error', async () => {
    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: mockHeaders,
      json: async () => ({ error: 'Failed to load courses' }),
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchCoursesByDegree('SE');
    });

    expect(result.current.error).toContain('HTTP 500');
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
    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockCourses,
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/courses'),
      expect.objectContaining({ method: 'GET' }),
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
    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: mockHeaders,
      json: async () => ({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(result.current.error).toContain('HTTP 500');
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

  // it('should set loading states correctly', async () => {
  //   fetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: async () => mockCourses,
  //   });

  //   const { result } = renderHook(() => useCourses());

  //   // Start fetching
  //   await act(async () => {
  //     const promise = result.current.fetchCoursesByDegree('CS');
  //     expect(result.current.loading).toBe(true);
  //     await promise;
  //   });

  //   expect(result.current.loading).toBe(false);
  //   expect(result.current.courseList).toEqual(mockCourses);
  // });
});
