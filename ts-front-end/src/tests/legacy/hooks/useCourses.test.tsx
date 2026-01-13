import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCourses from '../../../legacy/hooks/useCourses';

// Mock Sentry error class
vi.mock('../../middleware/SentryErrors', () => ({
  CourseListPageError: vi.fn().mockImplementation((msg) => ({
    name: 'CourseListPageError',
    message: msg,
  })),
}));

// Mock fetch
globalThis.fetch = vi.fn() as any;

describe('useCourses Hook', () => {
  const mockCourses = [
    { id: 1, name: 'ENCS 282' },
    { id: 2, name: 'COMP 248' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  // FETCH COURSES BY DEGREE TESTS

  it('should fetch courses by degree successfully', async () => {
    const mockHeaders = {
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockCourses,
    } as any);

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
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: mockHeaders,
      json: async () => ({ error: 'Failed to load courses' }),
    } as any);

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
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

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
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockCourses,
    } as any);

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
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: mockHeaders,
      json: async () => ({ error: 'Server error' }),
    } as any);

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
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    const { result } = renderHook(() => useCourses());

    await act(async () => {
      await result.current.fetchAllCourses();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.courseList).toEqual([]);
  });
});
