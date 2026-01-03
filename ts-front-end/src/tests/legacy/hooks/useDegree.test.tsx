import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useDegrees from '../../../legacy/hooks/useDegree';

// Mock fetch
globalThis.fetch = vi.fn() as any;

describe('useDegrees hook', () => {

  beforeEach(() => {
    vi.clearAllMocks();
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
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => mockDegrees.degrees,
    } as any);

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
      json: async () => ({}),
    } as any);

    const { result } = renderHook(() => useDegrees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.degrees).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  it('should handle fetch failure (network error)', async () => {
    const mockError = new Error('Network request failed');
    vi.mocked(fetch).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useDegrees());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.degrees).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  it('should start with loading true and reset to false after completion', async () => {
    const mockHeaders = {
      get: (name: string) => {
        if (name === 'Content-Type') return 'application/json';
        return null;
      },
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      headers: mockHeaders,
      json: async () => ({ degrees: [] }),
    } as any);

    const { result } = renderHook(() => useDegrees());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
