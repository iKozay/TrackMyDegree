import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../api/http-api-client';

/**
 * Custom hook for managing database backups
 * Handles fetching, creating, restoring, and deleting backups
 */
const useBackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of backups
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.post(
        '/admin/fetch-backups',
        {},
        {
          credentials: 'include',
        },
      );

      if (data.success) {
        setBackups(data.data);
        return { success: true, message: 'Backups fetched successfully' };
      } else {
        throw new Error('Failed to fetch backups');
      }
    } catch (err) {
      const errorMessage = err.message || 'Error fetching backups';
      setError(errorMessage);
      console.error('Error fetching backups:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new backup
  const createBackup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.post(
        '/admin/create-backup',
        {},
        {
          credentials: 'include',
        },
      );

      if (data.success) {
        await fetchBackups(); // Refresh list
        return { success: true, message: 'Backup created successfully' };
      } else {
        throw new Error('Failed to create backup');
      }
    } catch (err) {
      const errorMessage = err.message || 'Error creating backup';
      setError(errorMessage);
      console.error('Error creating backup:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchBackups]);

  // Restore a backup
  const restoreBackup = useCallback(async (backupName) => {
    if (!backupName) {
      return { success: false, message: 'Please select a backup to restore' };
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.post(
        '/admin/restore-backup',
        { backupName },
        {
          credentials: 'include',
        },
      );

      if (data.success) {
        return { success: true, message: 'Database restored successfully' };
      } else {
        throw new Error(data.message || 'Restore failed');
      }
    } catch (err) {
      const errorMessage = err.message || 'Error restoring backup';
      setError(errorMessage);
      console.error('Error restoring backup:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a backup
  const deleteBackup = useCallback(
    async (backupName) => {
      if (!backupName) {
        return { success: false, message: 'Please select a backup to delete' };
      }

      setLoading(true);
      setError(null);

      try {
        const data = await api.post(
          '/admin/delete-backup',
          { backupName },
          {
            credentials: 'include',
          },
        );

        if (data.success) {
          setSelectedBackup('');
          await fetchBackups(); // Refresh list
          return { success: true, message: 'Backup deleted successfully' };
        } else {
          throw new Error(data.message || 'Deletion failed');
        }
      } catch (err) {
        const errorMessage = err.message || 'Error deleting backup';
        setError(errorMessage);
        console.error('Error deleting backup:', err);
        return { success: false, message: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [fetchBackups],
  );

  // Fetch backups on mount
  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return {
    backups,
    selectedBackup,
    setSelectedBackup,
    loading,
    error,
    createBackup,
    restoreBackup,
    deleteBackup,
    refreshBackups: fetchBackups,
  };
};

export default useBackupManager;
