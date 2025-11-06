import { renderHook } from '@testing-library/react';
import { useRemainingCourses } from '../../hooks/useRemainingCourses';

describe('useRemainingCourses', () => {
  const allCourses = [{ _id: 'COMP101' }, { _id: 'MATH101' }, { _id: 'ENGR201' }];

  const coursePools = [{ courses: [{ _id: 'COMP101' }, { _id: 'MATH101' }] }];

  test('returns courses not in the pools', () => {
    const { result } = renderHook(() => useRemainingCourses(coursePools, allCourses));
    expect(result.current).toEqual([{ _id: 'ENGR201' }]);
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
