/* eslint-disable prettier/prettier */
import { useMemo } from 'react';

export const useRemainingCourses = (coursePools, allCourses) => {
    return useMemo(() => {
        if (!coursePools?.length || !allCourses?.length) return [];

        const normalizedDegreeCourseCodes = new Set(
            coursePools.flatMap((pool) =>
                (pool.courses || []).map((course) =>
                    course._id?.trim().toUpperCase()
                )
            )
        );

        return allCourses.filter(
            (course) => !normalizedDegreeCourseCodes.has(course._id?.trim().toUpperCase())
        );
    }, [coursePools, allCourses]);
};
