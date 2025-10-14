/* eslint-disable prettier/prettier */
import { useEffect } from 'react';
import { calculateTotalCredits2 } from '../utils/timelineUtils'; // adjust path


export const useCalculateTotalCredits = (state, dispatch, remainingCourses) => {
    useEffect(() => {


        const { total, unmetPrereqFound } = calculateTotalCredits2(
            state.semesterCourses,
            state.semesters,
            state.coursePools,
            remainingCourses,
            state.courseInstanceMap,
            state.allCourses
        );

        dispatch({
            type: 'SET',
            payload: {
                totalCredits: total,
                hasUnmetPrerequisites: unmetPrereqFound,
            },
        });
    }, [
        state.semesterCourses,
        state.semesters,
        state.coursePools,
        remainingCourses,
        state.courseInstanceMap,
        state.allCourses,
        dispatch,
    ]);
};
