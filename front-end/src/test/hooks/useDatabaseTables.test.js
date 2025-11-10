// src/test/useDatabaseTables.test.js
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import useDatabaseTables from '../../pages/AdminPage/hooks/useDatabaseTables';

// Mock api instead of fetch
jest.mock('../../api/http-api-client', () => ({
  api: {
    post: jest.fn(),
  },
}));

// Import api after mocking
import { api } from '../../api/http-api-client';


jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

// Mock console.error
const consoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = consoleError;
});

describe('useDatabaseTables', () => {
  let mockNavigate;

  beforeEach(() => {
    api.post.mockClear();
    console.error.mockClear();
    mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTables', () => {
    it('should fetch tables successfully on mount', async () => {
      const mockTables = ['users', 'courses', 'degrees'];
      api.post.mockResolvedValueOnce({
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
      api.post.mockRejectedValueOnce(error);

      renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/403');
      });
    });

    it('should handle error when data is not an array', async () => {
      api.post.mockResolvedValueOnce({
        success: true,
        data: 'not an array',
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle error when success is false', async () => {
      api.post.mockResolvedValueOnce({
        success: false,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should call fetch with correct parameters', async () => {
      api.post.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/admin/tables',
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
      api.post.mockResolvedValueOnce({
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
      api.post.mockResolvedValueOnce({
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
      api.post.mockResolvedValueOnce({
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

      api.post.mockResolvedValueOnce({
        success: true,
        data: mockTables1,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables1);
      });

      api.post.mockResolvedValueOnce({
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
      api.post.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      api.post.mockReturnValueOnce(promise);

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
      api.post.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useDatabaseTables());

      expect(result.current.loading).toBe(true);
    });

    it('should set loading to false after successful fetch', async () => {
      api.post.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading to false after error', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('error state', () => {
    it('should clear error on new fetch', async () => {
      // First fetch with error
      api.post.mockResolvedValueOnce({
        success: false,
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
      });

      // Second fetch should clear error
      api.post.mockResolvedValueOnce({
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
      api.post.mockResolvedValueOnce({
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
      api.post.mockResolvedValueOnce({
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
