// src/pages/CourseListPage/hooks/useCourses.js
import { useState, useRef, useCallback } from 'react';
import { CourseListPageError } from '../../../middleware/SentryErrors';

/**
 * Custom hook for fetching courses by degree or all courses
 * Handles AbortController for canceling previous requests
 */
const useCourses = () => {
  const [courseList, setCourseList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchController = useRef(null);

  const SERVER_URL = process.env.REACT_APP_SERVER;

  // Fetch courses for a specific degree (grouped by pool)
  const fetchCoursesByDegree = useCallback(async (degreeId) => {
    // Cancel previous request if exists
    if (fetchController.current) {
      fetchController.current.abort();
    }

    const controller = new AbortController();
    fetchController.current = controller;

    setLoading(true);
    setError(null);
    setCourseList([]);

    try {
      console.log('Fetching courses by degree:', degreeId);
      const response = await fetch(
        `${SERVER_URL}/courses/getByDegreeGrouped`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ degree: degreeId }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new CourseListPageError(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      setCourseList(data);
      console.log('Courses fetched:', data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error fetching courses');
        console.log('Error fetching courses:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [SERVER_URL]);

  // Fetch all courses
  const fetchAllCourses = useCallback(async () => {
    // Cancel previous request if exists
    if (fetchController.current) {
      fetchController.current.abort();
    }

    const controller = new AbortController();
    fetchController.current = controller;

    setLoading(true);
    setError(null);
    setCourseList([]);

    try {
      console.log('Fetching all courses');
      const response = await fetch(
        `${SERVER_URL}/courses/getallcourses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new CourseListPageError(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      
      // Wrap in group structure for consistency
      const groupedData = [
        {
          poolId: 'all',
          poolName: 'All Courses',
          courses: data,
        },
      ];
      
      setCourseList(groupedData);
      console.log('All courses fetched:', groupedData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Error fetching all courses');
        console.log('Error fetching all courses:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [SERVER_URL]);

  return {
    courseList,
    loading,
    error,
    fetchCoursesByDegree,
    fetchAllCourses,
  };
};

export default useCourses;