// src/pages/CourseListPage/hooks/useDegrees.js
import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Custom hook for fetching degrees from the server
 */
const useDegrees = () => {
  const [degrees, setDegrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const SERVER_URL = process.env.REACT_APP_SERVER;

  useEffect(() => {
    const getDegrees = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${SERVER_URL}/degree/getAllDegrees`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();
        setDegrees(jsonData.degrees || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch degrees');
        Sentry.captureException(err);
        console.error('Error fetching degrees:', err);
      } finally {
        setLoading(false);
      }
    };

    getDegrees();
  }, [SERVER_URL]);

  return {
    degrees,
    loading,
    error,
  };
};

export default useDegrees;
