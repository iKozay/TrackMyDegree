/* eslint-disable prettier/prettier */

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTimelineState } from '../utils/timelineUtils';

export const useBuildTimeline = ({
    timelineData,
    state,
    startingSemester,
    extendedCredit,
    dispatch,
}) => {
    const prevDeps = useRef({});
    const [computedExtendedCredit, setComputedExtendedCredit] = useState(extendedCredit);

    // 🔹 Memoize derived values to avoid re-running if inputs are shallowly equal
    const shouldRun = useMemo(() => {
        const hasPools = state.coursePools?.length > 0;
        if (!hasPools) return false;

        // Avoid recomputing unless necessary
        const depsChanged =
            prevDeps.current.timelineData !== timelineData ||
            prevDeps.current.startingSemester !== startingSemester ||
            prevDeps.current.extendedCredit !== extendedCredit ||
            prevDeps.current.coursePoolsLength !== state.coursePools.length;

        if (depsChanged) {
            prevDeps.current = {
                timelineData,
                startingSemester,
                extendedCredit,
                coursePoolsLength: state.coursePools.length,
            };
        }

        return depsChanged;
    }, [timelineData, startingSemester, extendedCredit, state.coursePools?.length]);

    useEffect(() => {
        if (!shouldRun) return;

        const {
            formattedSemesters,
            newSemesterCourses,
            newCourseInstanceMap,
            newUniqueCounter,
            deficiency,
            extendedC,
        } = buildTimelineState(timelineData, state, startingSemester, extendedCredit);

        // Avoid unnecessary re-render if no real changes
        const sameSemesters =
            JSON.stringify(state.semesters) === JSON.stringify(formattedSemesters);
        const sameCourses =
            JSON.stringify(state.semesterCourses) === JSON.stringify(newSemesterCourses);

        if (sameSemesters && sameCourses) return;

        const exemptionCoursesFromTimeline = (timelineData.find(
            (semester) => semester.term.toLowerCase() === 'exempted 2020'
        ) || {}).courses || [];

        dispatch({
            type: 'SET',
            payload: {
                semesters: formattedSemesters,
                semesterCourses: newSemesterCourses,
                courseInstanceMap: newCourseInstanceMap,
                uniqueIdCounter: newUniqueCounter,
                deficiencyCourses: deficiency.courses,
                deficiencyCredits: deficiency.credits,
                exemptionCodes: exemptionCoursesFromTimeline,

            },
        });

        setComputedExtendedCredit(extendedC);
    }, [shouldRun, timelineData, state.coursePools, extendedCredit, startingSemester, dispatch]);


    return computedExtendedCredit;
};
