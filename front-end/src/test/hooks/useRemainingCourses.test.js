import { renderHook } from '@testing-library/react';
import { useRemainingCourses } from '../../hooks/useRemainingCourses';

describe('useRemainingCourses', () => {
  const allCourses = [{ code: 'COMP101' }, { code: 'MATH101' }, { code: 'ENGR201' }];

  const coursePools = [{ courses: [{ code: 'COMP101' }, { code: 'MATH101' }] }];

  test('returns courses not in the pools', () => {
    const { result } = renderHook(() => useRemainingCourses(coursePools, allCourses));
    expect(result.current).toEqual([{ code: 'ENGR201' }]);
  });

  test('returns empty array if coursePools is empty', () => {
    const { result } = renderHook(() => useRemainingCourses([], allCourses));
    expect(result.current).toEqual([]);
  });

  test('returns empty array if allCourses is empty', () => {
    const { result } = renderHook(() => useRemainingCourses(coursePools, []));
    expect(result.current).toEqual([]);
  });
});
