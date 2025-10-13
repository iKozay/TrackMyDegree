import { renderHook } from '@testing-library/react';
import { useFirstOccurrence } from '../../hooks/useFirstOccurence';

describe('useFirstOccurrence', () => {
    const semesters = [
        { id: 'fall2023' },
        { id: 'winter2024' },
        { id: 'exempted' },
        { id: 'summer2024' },
    ];

    const semesterCourses = {
        fall2023: ['A', 'B', 'C'],
        winter2024: ['B', 'D'],
        exempted: ['E'],
        summer2024: ['A', 'E'],
    };

    const courseInstanceMap = {
        A: 'COMP100',
        B: 'COMP200',
        C: 'COMP300',
        D: 'COMP400',
        E: 'COMP500',
    };


    it('skips the "exempted" semester', () => {
        const { result } = renderHook(() =>
            useFirstOccurrence(semesters, semesterCourses, courseInstanceMap)
        );
        expect(Object.values(result.current)).not.toContain(2); // index 2 is exempted
    });

    it('handles empty semesters', () => {
        const { result } = renderHook(() =>
            useFirstOccurrence([], {}, {})
        );
        expect(result.current).toEqual({});
    });

    it('handles missing courseInstanceMap (uses instanceId as fallback)', () => {
        const { result } = renderHook(() =>
            useFirstOccurrence(
                [{ id: 'fall2023' }],
                { fall2023: ['A', 'B'] },
                {}
            )
        );
        expect(result.current).toEqual({
            A: 0,
            B: 0,
        });
    });

    it('handles courses appearing in multiple semesters', () => {
        const semesters = [
            { id: 's1' },
            { id: 's2' },
            { id: 's3' },
        ];
        const semesterCourses = {
            s1: ['X'],
            s2: ['X', 'Y'],
            s3: ['Y', 'Z'],
        };
        const courseInstanceMap = {
            X: 'C1',
            Y: 'C2',
            Z: 'C3',
        };
        const { result } = renderHook(() =>
            useFirstOccurrence(semesters, semesterCourses, courseInstanceMap)
        );
        expect(result.current).toEqual({
            C1: 0,
            C2: 1,
            C3: 2,
        });
    });
});