// src/test/useDatabaseTables.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import useDatabaseTables from '../../../legacy/hooks/useDatabaseTables';
import { api } from '../../../api/http-api-client';

// Mock api instead of fetch
vi.mock('../../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

// Mock console.error
const consoleError = console.error;
beforeAll(() => {
  console.error = vi.fn() as any;
});
afterAll(() => {
  console.error = consoleError;
});

describe('useDatabaseTables', () => {
  let mockNavigate: any;

  beforeEach(() => {
    vi.mocked(api.get).mockClear();
    vi.mocked(console.error).mockClear();
    mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchTables', () => {
    it('should fetch tables successfully on mount', async () => {
      const mockTables = ['users', 'courses', 'degrees'];
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTables,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
      });
    });

    it('should navigate to /403 when response is not ok', async () => {
      const error = new Error('403 Forbidden');
      error.message = '403 Forbidden';
      vi.mocked(api.get).mockRejectedValueOnce(error);

      renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/403');
      });
    });

    it('should handle error when data is not an array', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: 'not an array',
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle error when success is false', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: false,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should call fetch with correct parameters', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/admin/collections',
          {},
          expect.objectContaining({
            credentials: 'include',
          }),
        );
      });
    });
  });

  describe('handleTableSelect', () => {
    it('should update selected table', async () => {
      const mockTables = ['users', 'courses'];
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTables,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTableSelect('users');
      });

      expect(result.current.selectedTable).toBe('users');
    });

    it('should allow selecting different tables', async () => {
      const mockTables = ['users', 'courses'];
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTables,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTableSelect('users');
      });
      expect(result.current.selectedTable).toBe('users');

      act(() => {
        result.current.handleTableSelect('courses');
      });
      expect(result.current.selectedTable).toBe('courses');
    });

    it('should handle null table selection', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTableSelect(null);
      });

      expect(result.current.selectedTable).toBe(null);
    });
  });

  describe('refreshTables', () => {
    it('should refresh tables when called', async () => {
      const mockTables1 = ['users'];
      const mockTables2 = ['users', 'courses'];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTables1,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables1);
      });

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockTables2,
      });

      await act(async () => {
        await result.current.refreshTables();
      });

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables2);
      });
    });

    it('should set loading state during refresh', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.get).mockReturnValueOnce(promise as any);

      act(() => {
        result.current.refreshTables();
      });

      expect(result.current.loading).toBe(true);

      resolvePromise({
        success: true,
        data: [],
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('loading state', () => {
    it('should set loading to true initially', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {}) as any);

      const { result } = renderHook(() => useDatabaseTables());

      expect(result.current.loading).toBe(true);
    });

    it('should set loading to false after successful fetch', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading to false after error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error state', () => {
    it('should clear error on new fetch', async () => {
      // First fetch with network error
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
      });

      // Second fetch should clear error
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      await act(async () => {
        await result.current.refreshTables();
      });

      // Error should be cleared at the start of new fetch
      await waitFor(() => {
        expect(result.current.error).toBe('');
      });
    });

    it('should have empty error initially', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('');
      });
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tables).toEqual([]);
      expect(result.current.selectedTable).toBe(null);
      expect(result.current.error).toBe('');
    });
  });
});
