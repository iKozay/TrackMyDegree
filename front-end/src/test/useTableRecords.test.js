// src/pages/AdminPage/hooks/__tests__/useTableRecords.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import useTableRecords from '../pages/AdminPage/hooks/useTableRecords';

// Mock fetch
global.fetch = jest.fn();

// Mock console.error to avoid cluttering test output
const consoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = consoleError;
});

describe('useTableRecords', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.error.mockClear();
    process.env.REACT_APP_SERVER = 'http://localhost:5000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRecords', () => {
    it('should fetch records successfully', async () => {
      const mockRecords = [
        { id: 1, name: 'John', email: 'john@test.com' },
        { id: 2, name: 'Jane', email: 'jane@test.com' },
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockRecords }),
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
      const mockRecords = [
        { id: 1, name: 'John', email: 'john@test.com' },
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockRecords }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users', 'john');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/admin/tables/users?keyword=john',
        expect.any(Object)
      );

      await waitFor(() => {
        expect(result.current.records).toEqual(mockRecords);
      });
    });

    it('should handle empty records', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
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

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when tableName is null', async () => {
      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords(null);
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle error when data is not an array', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: 'not an array' }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table records');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle error when success is false', async () => {
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: false }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table records');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

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
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users', 'test@email.com');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/admin/tables/users?keyword=test%40email.com',
        expect.any(Object)
      );
    });

    it('should extract columns from first record', async () => {
      const mockRecords = [
        { id: 1, username: 'john', age: 25 },
        { id: 2, username: 'jane', age: 30 },
      ];

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockRecords }),
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

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockRecords }),
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

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle empty search keyword', async () => {
      const mockRecords = [{ id: 1, name: 'John' }];

      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockRecords }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        result.current.handleSearch('users', '');
      });

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:5000/admin/tables/users',
        expect.any(Object)
      );
    });
  });

  describe('loading state', () => {
    it('should set loading to true during fetch', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce({ json: () => promise });

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
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      fetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should clear error on new fetch', async () => {
      // First fetch with error
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: false }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second fetch should clear error
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
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
      fetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useTableRecords());

      await act(async () => {
        await result.current.fetchRecords('users');
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
  });
});