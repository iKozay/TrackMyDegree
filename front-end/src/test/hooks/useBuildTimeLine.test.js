import { renderHook, act } from '@testing-library/react';
import { useBuildTimeline } from '../../hooks/useBuildTimeline';
import { buildTimelineState } from '../../utils/timelineUtils';

// Mock buildTimelineState function
jest.mock('../../utils/timelineUtils', () => ({
    buildTimelineState: jest.fn(),
}));

describe('useBuildTimeline hook', () => {
    const mockDispatch = jest.fn();
    const mockTimelineData = [
        { term: 'Fall 2025', courses: ['COMP101', 'MATH101'] },
        { term: 'Exempted 2020', courses: ['ENGR101'] },
    ];
    const mockState = {
        semesters: [],
        semesterCourses: {},
        courseInstanceMap: {},
        coursePools: ['pool1'],
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });


    test('should update extendedCredit when buildTimelineState changes it', () => {
        buildTimelineState.mockReturnValue({
            formattedSemesters: ['sem1'],
            newSemesterCourses: { sem1: ['COMP101'] },
            newCourseInstanceMap: { id1: 'COMP101' },
            newUniqueCounter: 1,
            deficiency: { courses: ['MATH101'], credits: 3 },
            extendedC: 18,
        });

        const { result } = renderHook(() =>
            useBuildTimeline({
                timelineData: mockTimelineData,
                state: mockState,
                startingSemester: 'Fall 2025',
                extendedCredit: 15,
                dispatch: mockDispatch,
            })
        );

        expect(result.current).toBe(18);
        expect(mockDispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'SET',
                payload: expect.objectContaining({
                    semesters: ['sem1'],
                    deficiencyCourses: ['MATH101'],
                    deficiencyCredits: 3,
                    uniqueIdCounter: 1,
                    courseInstanceMap: { id1: 'COMP101' },
                    exemptionCodes: ['ENGR101'],
                }),
            })
        );
    });
});
