import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminPageError } from '../../../middleware/SentryErrors';

/**
 * Custom hook for managing database tables
 * Handles fetching tables and managing selected table state
 */
const useDatabaseTables = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const SERVER_URL = process.env.REACT_APP_SERVER;

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      let response = await fetch(`${SERVER_URL}/admin/tables`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        navigate('/403'); // Forbidden
        return;
      }

      response = await response.json();

      if (response.success) {
        if (Array.isArray(response.data)) {
          setTables(response.data);
        } else {
          throw new AdminPageError('Tables data is not an array');
        }
      } else {
        throw new AdminPageError('Failed to fetch tables');
      }
    } catch (err) {
      console.error('Error fetching table list:', err);
      setError('Error fetching table list');
    } finally {
      setLoading(false);
    }
  }, [SERVER_URL, navigate]);

  // Fetch tables on mount
  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const handleTableSelect = useCallback((tableName) => {
    setSelectedTable(tableName);
  }, []);

  return {
    tables,
    selectedTable,
    loading,
    error,
    handleTableSelect,
    refreshTables: fetchTables,
  };
};

export default useDatabaseTables;