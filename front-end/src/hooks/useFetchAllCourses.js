/* eslint-disable prettier/prettier */
import { useEffect } from 'react';

import { api } from '../api/http-api-client';

export const useFetchAllCourses = (dispatch, extendedCredit) => {
    // NEW: Fetch all courses from /courses/getAllCourses
    useEffect(() => {
        const fetchAllCourses = async () => {
            // throw new TimelineError('Failed to fetch all courses');
            try {
                const courses = await api.get('/courses');

                dispatch({ type: 'SET', payload: { allCourses: courses } });
            } catch (err) {
                console.error('Error fetching all courses', err);
            }
        };

        fetchAllCourses();

        const storedTimelineName = localStorage.getItem('Timeline_Name');

        if (storedTimelineName && storedTimelineName !== 'null') {
            dispatch({ type: 'SET', payload: { timelineName: storedTimelineName } });
        } else {
            dispatch({ type: 'SET', payload: { timelineName: '' } });
        }

        dispatch({ type: 'SET', payload: { isECP: extendedCredit } });
    }, []);
};

export default useFetchAllCourses;
