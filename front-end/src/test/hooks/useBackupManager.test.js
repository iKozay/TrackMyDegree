import { renderHook, act, waitFor } from '@testing-library/react';
import useBackupManager from '../../pages/AdminPage/hooks/useBackupManager';

// Mock fetch
global.fetch = jest.fn();

describe('useBackupManager', () => {
  beforeEach(() => {
    fetch.mockClear();
    process.env.REACT_APP_SERVER = 'http://localhost:5000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchBackups', () => {
    it('should fetch backups successfully on mount', async () => {
      const mockBackups = ['backup1.sql', 'backup2.sql'];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockBackups }),
      });

      const { result } = renderHook(() => useBackupManager());

      await waitFor(() => {
        expect(result.current.backups).toEqual(mockBackups);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

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
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useBackupManager());

      // Mock create backup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Mock refresh backups
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['new-backup.sql'] }),
      });

      let response;
      await act(async () => {
        response = await result.current.createBackup();
      });

      expect(response.success).toBe(true);
      expect(response.message).toContain('created successfully');
    });

    it('should handle create backup failure', async () => {
      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useBackupManager());

      // Mock failed create
      fetch.mockResolvedValueOnce({
        ok: false,
      });

      let response;
      await act(async () => {
        response = await result.current.createBackup();
      });

      expect(response.success).toBe(false);
    });
  });

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      });

      const { result } = renderHook(() => useBackupManager());

      // Mock restore
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      let response;
      await act(async () => {
        response = await result.current.restoreBackup('backup1.sql');
      });

      expect(response.success).toBe(true);
      expect(response.message).toContain('restored successfully');
    });

    it('should fail if no backup selected', async () => {
      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { result } = renderHook(() => useBackupManager());

      let response;
      await act(async () => {
        response = await result.current.restoreBackup('');
      });

      expect(response.success).toBe(false);
      expect(response.message).toContain('select a backup');
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      });

      const { result } = renderHook(() => useBackupManager());

      // Mock delete
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Mock refresh
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      let response;
      await act(async () => {
        response = await result.current.deleteBackup('backup1.sql');
      });

      expect(response.success).toBe(true);
      expect(result.current.selectedBackup).toBe('');
    });
  });

  describe('setSelectedBackup', () => {
    it('should update selected backup', async () => {
      // Mock initial fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: ['backup1.sql'] }),
      });

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
