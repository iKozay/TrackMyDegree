import { renderHook, act, waitFor } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import useDatabaseTables from '../useDatabaseTables';
import { AdminPageError } from '../../../middleware/SentryErrors';

// Mock fetch and useNavigate
global.fetch = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

describe('useDatabaseTables', () => {
  let mockNavigate;

  beforeEach(() => {
    fetch.mockClear();
    mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);
    process.env.REACT_APP_SERVER = 'http://localhost:5000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTables', () => {
    it('should fetch tables successfully on mount', async () => {
      const mockTables = ['users', 'courses', 'degrees'];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTables }),
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
      });
    });

    it('should navigate to /403 when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
      });

      renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/403');
      });
    });

    it('should handle error when data is not an array', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: 'not an array' }),
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle error when success is false', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false }),
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.error).toBe('Error fetching table list');
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('handleTableSelect', () => {
    it('should update selected table', async () => {
      const mockTables = ['users', 'courses'];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTables }),
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
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTables }),
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
  });

  describe('refreshTables', () => {
    it('should refresh tables when called', async () => {
      const mockTables1 = ['users'];
      const mockTables2 = ['users', 'courses'];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTables1 }),
      });

      const { result } = renderHook(() => useDatabaseTables());

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables1);
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTables2 }),
      });

      await act(async () => {
        await result.current.refreshTables();
      });

      await waitFor(() => {
        expect(result.current.tables).toEqual(mockTables2);
      });
    });
  });

  describe('loading state', () => {
    it('should set loading to true during fetch', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      fetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useDatabaseTables());

      expect(result.current.loading).toBe(true);

      resolvePromise({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});