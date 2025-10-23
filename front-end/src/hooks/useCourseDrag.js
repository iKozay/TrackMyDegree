/* eslint-disable prettier/prettier */
// useCourseDrag.js
import { useCallback } from 'react';
import { generateUniqueId, removeCourseFromSemester, findSemesterIdByCourseCode, calculateSemesterCredits, getMaxCreditsForSemesterName, isTheCourseAssigned } from '../utils/timelineUtils';

export const useCourseDrag = (state, dispatch) => {

    const isCourseAssigned = useCallback(
        (courseCode) => {
            return isTheCourseAssigned(courseCode, state.semesterCourses, state.courseInstanceMap);
        },
        [state.semesterCourses, state.courseInstanceMap]
    );

    const shakeSemester = useCallback((semId) => {
        dispatch({ type: 'SET', payload: { shakingSemesterId: semId } });
        setTimeout(() => dispatch({ type: 'SET', payload: { shakingSemesterId: null } }), 2000);
    }, [dispatch]);

    const handleDragStart = useCallback((event) => {
        const internalId = String(event.active.id);
        const courseCode = event.active.data.current.courseCode;
        const course =
            state.allCourses.find((c) => c.code === courseCode) ||
            state.deficiencyCourses.find((c) => c.code === courseCode);

        dispatch({
            type: 'SET',
            payload: {
                returning: false,
                activeCourseCode: courseCode,
                selectedCourse: course || null,
                activeId: internalId,
            },
        });
    }, [state.allCourses, state.deficiencyCourses, dispatch]);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!over) {
            dispatch({ type: 'SET', payload: { activeId: null } });
            document.querySelector('.semesters')?.classList.remove('no-scroll');
            return;
        }

        const uniqueId = String(active.id);
        const draggedGeneric = active.data.current.courseCode;
        const sourceContainer = active.data.current.containerId;
        const isFromDeficiencyList = sourceContainer === 'deficiencyList';

        let draggedId = uniqueId;
        let newCourseInstanceMap = { ...state.courseInstanceMap };
        let newUniqueIdCounter = state.uniqueIdCounter;

        if (sourceContainer === 'courseList' || isFromDeficiencyList) {
            draggedId = generateUniqueId(draggedGeneric, newUniqueIdCounter);
            newUniqueIdCounter++;
            newCourseInstanceMap[draggedId] = draggedGeneric;
        }

        let overSemesterId = over.data.current?.containerId || findSemesterIdByCourseCode(over.id, state.semesterCourses);
        let overIndex = state.semesterCourses[overSemesterId]?.indexOf(over.id) ?? 0;

        let updatedSemesterCourses = removeCourseFromSemester(draggedId, state.semesterCourses);

        const exists = updatedSemesterCourses[overSemesterId]?.some(
            (code) => (newCourseInstanceMap[code] || code) === draggedGeneric
        );
        if (exists) return;

        if (!updatedSemesterCourses[overSemesterId]) updatedSemesterCourses[overSemesterId] = [];
        updatedSemesterCourses[overSemesterId].splice(overIndex, 0, draggedId);

        const overSemesterObj = state.semesters.find((s) => s.id === overSemesterId);
        if (overSemesterObj) {
            const sumCredits = calculateSemesterCredits(
                overSemesterId,
                updatedSemesterCourses,
                newCourseInstanceMap,
                state.allCourses
            );
            const maxAllowed = getMaxCreditsForSemesterName(overSemesterObj.name);
            if (sumCredits > maxAllowed) shakeSemester(overSemesterId);
        }

        dispatch({
            type: 'SET',
            payload: {
                semesterCourses: updatedSemesterCourses,
                courseInstanceMap: newCourseInstanceMap,
                uniqueIdCounter: newUniqueIdCounter,
                activeId: null,
                hasUnsavedChanges: true,
            },
        });

        document.querySelector('.semesters')?.classList.remove('no-scroll');
    }, [state, dispatch, shakeSemester]);

    const handleDragCancel = useCallback(() => {
        dispatch({ type: 'SET', payload: { activeId: null } });
        document.querySelector('.semesters')?.classList.remove('no-scroll');
    }, [dispatch]);

    const handleReturn = useCallback((courseCode) => {
        const updatedSemesters = { ...state.semesterCourses };
        for (const semesterId in updatedSemesters) {
            updatedSemesters[semesterId] = updatedSemesters[semesterId].filter((code) => code !== courseCode);
        }
        dispatch({ type: 'SET', payload: { returning: true, hasUnsavedChanges: true, semesterCourses: updatedSemesters } });
    }, [state.semesterCourses, dispatch]);

    const handleCourseSelect = useCallback((code) => {
        let genericCode = code.startsWith("source-") ? code.replace("source-", "") : state.courseInstanceMap[code] || code;
        const course = state.allCourses.find((c) => c.code === genericCode);
        if (course) dispatch({ type: 'SET', payload: { selectedCourse: course } });
    }, [state.allCourses, state.courseInstanceMap, dispatch]);


    return {
        isCourseAssigned,
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
        handleReturn,
        handleCourseSelect,
    };
};
