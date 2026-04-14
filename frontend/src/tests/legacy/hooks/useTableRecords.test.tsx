// src/pages/AdminPage/hooks/__tests__/useTableRecords.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useTableRecords from '../../../legacy/hooks/useTableRecords';
import { api } from '../../../api/http-api-client';

// Mock api instead of fetch
vi.mock('../../../api/http-api-client', () => ({
  api: {
    get: vi.fn(),
  },
}));

// Mock console.error to avoid cluttering test output
const consoleError = console.error;
beforeAll(() => {
  console.error = vi.fn() as any;
});
afterAll(() => {
  console.error = consoleError;
});

describe('useTableRecords', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockClear();
    vi.mocked(console.error).mockClear();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchRecords', () => {
    it('should fetch records successfully', async () => {
      const mockRecords = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockRecords,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.records).toEqual(mockRecords);
        expect(result.current.columns).toEqual(['id', 'name', 'email']);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
      });
    });

    it('should fetch records with search keyword', async () => {
      const mockRecords = [{ id: 1, name: 'John', email: 'john@test.com' }];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockRecords,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users', 'john');
      });

      expect(api.get).toHaveBeenCalledWith(
        '/admin/collections/users/documents?keyword=john',
        {},
        expect.objectContaining({
          credentials: 'include',
        }),
      );

      await waitFor(() => {
        expect(result.current.records).toEqual(mockRecords);
      });
    });

    it('should handle empty records', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.records).toEqual([]);
        expect(result.current.columns).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should not fetch when tableName is not provided', async () => {
      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('');
      });

      expect(api.get).not.toHaveBeenCalled();
    });

    it('should not fetch when tableName is null', async () => {
      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords(null);
      });

      expect(api.get).not.toHaveBeenCalled();
    });

    it('should handle error when data is not an array', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: 'not an array',
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.records).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle error when success is false', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: false,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.records).toEqual([]);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table records');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should encode special characters in keyword', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users', 'test@email.com');
      });

      expect(api.get).toHaveBeenCalledWith(
        '/admin/collections/users/documents?keyword=test%40email.com',
        {},
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });

    it('should extract columns from first record', async () => {
      const mockRecords = [
        { id: 1, username: 'john', age: 25 },
        { id: 2, username: 'jane', age: 30 },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockRecords,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.columns).toEqual(['id', 'username', 'age']);
      });
    });
  });

  describe('handleSearch', () => {
    it('should call fetchRecords with search keyword', async () => {
      const mockRecords = [{ id: 1, name: 'John' }];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockRecords,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        result.current.handleSearch('users', 'john');
      });

      await waitFor(() => {
        expect(result.current.records).toEqual(mockRecords);
      });
    });

    it('should not search if tableName is not provided', async () => {
      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        result.current.handleSearch('', 'john');
      });

      expect(api.get).not.toHaveBeenCalled();
    });

    it('should handle empty search keyword', async () => {
      const mockRecords = [{ id: 1, name: 'John' }];

      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: mockRecords,
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        result.current.handleSearch('users', '');
      });

      expect(api.get).toHaveBeenCalledWith(
        '/admin/collections/users/documents',
        {},
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });
  });

  describe('loading state', () => {
    it('should set loading to true during fetch', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.get).mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useTableRecords());

      act(() => {
        result.current.fetchRecords('users');
      });

      expect(result.current.loading).toBe(true);

      resolvePromise({ success: true, data: [] });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading to false after successful fetch', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should clear error on new fetch', async () => {
      // First fetch with network error
      vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table records');
      });

      // Second fetch should clear error
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('');
      });
    });
  });

  describe('credentials and request options', () => {
    it('should send request with credentials included', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(api.get).toHaveBeenCalledWith(
        '/admin/collections/users/documents',
        {},
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });
  });
});
