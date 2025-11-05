import { useState, useCallback } from 'react';
import { AdminPageError } from '../../../middleware/SentryErrors';
import { api } from '../../../api/http-api-client';

/**
 * Custom hook for fetching and managing table records
 * Handles searching and filtering records
 */
const useTableRecords = () => {
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async (tableName, keyword = '') => {
    if (!tableName) return;

    setLoading(true);
    setError('');

    try {
      let endpoint = `/admin/tables/${tableName}`;
      if (keyword) {
        endpoint += `?keyword=${encodeURIComponent(keyword)}`;
      }

      const response = await api.post(
        endpoint,
        {},
        {
          credentials: 'include',
        },
      );

      if (response.success) {
        if (Array.isArray(response.data)) {
          setRecords(response.data);
          if (response.data.length > 0) {
            setColumns(Object.keys(response.data[0]));
          } else {
            setColumns([]);
          }
        } else {
          throw new AdminPageError('Records data is not an array');
        }
      } else {
        throw new AdminPageError('Failed to fetch records');
      }
    } catch (err) {
      console.error('Error fetching table records:', err);
      setError('Error fetching table records');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (tableName, searchKeyword) => {
      if (tableName) {
        fetchRecords(tableName, searchKeyword);
      }
    },
    [fetchRecords],
  );

  return {
    records,
    columns,
    loading,
    error,
    fetchRecords,
    handleSearch,
  };
};

export default useTableRecords;
