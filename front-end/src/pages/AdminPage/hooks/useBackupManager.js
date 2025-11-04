import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing database backups
 * Handles fetching, creating, restoring, and deleting backups
 */
const useBackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const SERVER_URL = process.env.REACT_APP_SERVER;

  // Fetch list of backups
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SERVER_URL}/admin/fetch-backups`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch backups');
      }

      const data = await response.json();

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
  }, [SERVER_URL]);

  // Create a new backup
  const createBackup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SERVER_URL}/admin/create-backup`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to create backup');
      }

      const data = await response.json();

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
  }, [SERVER_URL, fetchBackups]);

  // Restore a backup
  const restoreBackup = useCallback(
    async (backupName) => {
      if (!backupName) {
        return { success: false, message: 'Please select a backup to restore' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${SERVER_URL}/admin/restore-backup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupName }),
        });

        if (!response.ok) {
          throw new Error('Failed to restore backup');
        }

        const data = await response.json();

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
    },
    [SERVER_URL],
  );

  // Delete a backup
  const deleteBackup = useCallback(
    async (backupName) => {
      if (!backupName) {
        return { success: false, message: 'Please select a backup to delete' };
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${SERVER_URL}/admin/delete-backup`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backupName }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete backup');
        }

        const data = await response.json();

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
    [SERVER_URL, fetchBackups],
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
