import { renderHook, act } from '@testing-library/react';
import { useCourseDrag } from '../../hooks/useCourseDrag';
import * as timelineUtils from '../../utils/timelineUtils';

jest.mock('../../utils/timelineUtils', () => ({
    generateUniqueId: jest.fn((code, counter) => `${code}-${counter}`),
    removeCourseFromSemester: jest.fn((id, courses) => ({ ...courses })),
    findSemesterIdByCourseCode: jest.fn(),
    calculateSemesterCredits: jest.fn(() => 3),
    getMaxCreditsForSemesterName: jest.fn(() => 10),
    isTheCourseAssigned: jest.fn(() => true),
}));

describe('useCourseDrag', () => {
    const mockDispatch = jest.fn();
    const mockState = {
        semesters: [{ id: 's1', name: 'Fall 2025' }],
        semesterCourses: { s1: ['C1'] },
        courseInstanceMap: { C1: 'COMP101' },
        allCourses: [{ code: 'COMP101', name: 'Intro to CS' }],
        deficiencyCourses: [],
        uniqueIdCounter: 0,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should return hook functions and isCourseAssigned works', () => {
        const { result } = renderHook(() => useCourseDrag(mockState, mockDispatch));

        expect(result.current).toHaveProperty('isCourseAssigned');
        expect(result.current).toHaveProperty('handleDragStart');
        expect(result.current).toHaveProperty('handleDragEnd');
        expect(result.current).toHaveProperty('handleDragCancel');
        expect(result.current).toHaveProperty('handleReturn');
        expect(result.current).toHaveProperty('handleCourseSelect');

        // Test isCourseAssigned calls underlying util
        act(() => {
            const assigned = result.current.isCourseAssigned('COMP101');
            expect(timelineUtils.isTheCourseAssigned).toHaveBeenCalledWith(
                'COMP101',
                mockState.semesterCourses,
                mockState.courseInstanceMap
            );
            expect(assigned).toBe(true);
        });

        // Test handleDragStart dispatches
        act(() => {
            result.current.handleDragStart({
                active: { id: 'C1', data: { current: { courseCode: 'COMP101' } } },
            });
            expect(mockDispatch).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'SET',
                    payload: expect.objectContaining({ activeCourseCode: 'COMP101' }),
                })
            );
        });
    });
});
