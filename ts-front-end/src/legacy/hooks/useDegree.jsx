import { useState, useEffect } from 'react';
import { api } from '../../api/http-api-client';

/**
 * Custom hook for fetching degrees from the server
 */
const useDegrees = () => {
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getDegrees = async () => {
      setLoading(true);
      setError(null);

      try {
        const degrees = await api.get('/degree');
        setDegrees(degrees || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch degrees');
        console.error('Error fetching degrees:', err);
      } finally {
        setLoading(false);
      }
    };

    getDegrees();
  }, []);

  return {
    degrees,
    loading,
    error,
  };
};

export default useDegrees;
