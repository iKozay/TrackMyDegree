import { renderHook, waitFor } from '@testing-library/react';
import useDegrees from '../../pages/CourseListPage/hooks/useDegree';
import * as Sentry from '@sentry/react';

// Mock Sentry
jest.mock('@sentry/react', () => ({
  captureException: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useDegrees hook', () => {
  const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:8000';

  beforeEach(() => {
    jest.clearAllMocks();
    // http-api-client reads REACT_APP_SERVER at module load time
    // If not set, it defaults to http://localhost:8000
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  it('should fetch degrees successfully', async () => {
    const mockDegrees = {
      degrees: [
        { id: 1, name: 'Computer Science' },
        { id: 2, name: 'Software Engineering' },
      ],
    };

    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockDegrees.degrees,
    });

    const { result } = renderHook(() => useDegrees());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for fetch to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/degree'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );

    expect(result.current.degrees).toEqual(mockDegrees.degrees);
    expect(result.current.error).toBeNull();
  });

  it('should handle non-OK response correctly', async () => {
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
      json: async () => ({}),
    });

    const { result } = renderHook(() => useDegrees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.degrees).toEqual([]);
    expect(result.current.error).toContain('HTTP 500');
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('should handle fetch failure (network error)', async () => {
    const mockError = new Error('Network request failed');
    fetch.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDegrees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.degrees).toEqual([]);
    expect(result.current.error).toBe('Network request failed');
    expect(Sentry.captureException).toHaveBeenCalledWith(mockError);
  });

  it('should start with loading true and reset to false after completion', async () => {
    const mockHeaders = {
      get: (name) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => ({ degrees: [] }),
    });

    const { result } = renderHook(() => useDegrees());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
