import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import useBackupManager from '../../../legacy/hooks/useBackupManager';

// Mock fetch
globalThis.fetch = vi.fn() as any;

// Helper to create mock headers
const createMockHeaders = () => ({
  get: (name: string) => {
    if (name === 'Content-Type') return 'application/json';
    return null;
  },
});

describe('useBackupManager', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockClear();
    if (!process.env.REACT_APP_SERVER) {
      process.env.REACT_APP_SERVER = 'http://localhost:8000';
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBackups', () => {
    it('should fetch backups successfully on mount', async () => {
      const mockBackups = ['backup1.sql', 'backup2.sql'];
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: mockBackups }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      await waitFor(() => {
        expect(result.current.backups).toEqual(mockBackups);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useBackupManager());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      // Mock create backup
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true }),
      } as Response);

      // Mock refresh backups
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: ['new-backup.sql'] }),
      } as Response);

      let response: any;
      await act(async () => {
        response = await result.current.createBackup();
      });

      expect(response?.success).toBe(true);
      expect(response?.message).toContain('created successfully');
    });

    it('should handle create backup failure', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      // Mock failed create
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        headers: createMockHeaders(),
      } as Response);

      let response: any;
      await act(async () => {
        response = await result.current.createBackup();
      });

      expect(response?.success).toBe(false);
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      // Mock restore
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true }),
      } as Response);

      let response: any;
      await act(async () => {
        response = await result.current.restoreBackup('backup1.sql');
      });

      expect(response?.success).toBe(true);
      expect(response?.message).toContain('restored successfully');
    });

    it('should fail if no backup selected', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: [] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      let response: any;
      await act(async () => {
        response = await result.current.restoreBackup('');
      });

      expect(response?.success).toBe(false);
      expect(response?.message).toContain('select a backup');
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      // Mock delete
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true }),
      } as Response);

      // Mock refresh
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: [] }),
      } as Response);

      let response: any;
      await act(async () => {
        response = await result.current.deleteBackup('backup1.sql');
      });

      expect(response?.success).toBe(true);
      expect(result.current.selectedBackup).toBe('');
    });
  });

  describe('setSelectedBackup', () => {
    it('should update selected backup', async () => {
      // Mock initial fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: createMockHeaders(),
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      } as Response);

      const { result } = renderHook(() => useBackupManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSelectedBackup('backup1.sql');
      });

      expect(result.current.selectedBackup).toBe('backup1.sql');
    });
  });
});
