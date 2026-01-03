import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/http-api-client';

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

  const fetchTables = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(
        '/admin/collections',
        {},
        {
          credentials: 'include',
        },
      );

      if (response.success) {
        if (Array.isArray(response.data)) {
          setTables(response.data);
        } else {
          console.log('Tables data is not an array');
        }
      } else {
        console.log('Failed to fetch tables');
      }
    } catch (err) {
      if (err.message && err.message.includes('403')) {
        navigate('/403'); // Forbidden
      } else {
        console.error('Error fetching table list:', err);
        setError('Error fetching table list');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

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
