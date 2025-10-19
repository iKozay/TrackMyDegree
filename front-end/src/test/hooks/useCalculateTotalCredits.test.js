import { renderHook } from '@testing-library/react';
import { useCalculateTotalCredits } from '../../hooks/useCalculateTotalCredits';
import * as timelineUtils from '../../utils/timelineUtils';

describe('useCalculateTotalCredits', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call calculateTotalCredits2 with correct arguments and dispatch result', () => {
    const mockResult = { total: 30, unmetPrereqFound: false };
    jest.spyOn(timelineUtils, 'calculateTotalCredits2').mockReturnValue(mockResult);

    const state = {
      semesterCourses: ['course1', 'course2'],
      semesters: ['Fall', 'Winter'],
      coursePools: ['pool1'],
      courseInstanceMap: {},
      allCourses: ['course1', 'course2'],
    };
    const remainingCourses = ['course3'];

    renderHook(() => useCalculateTotalCredits(state, mockDispatch, remainingCourses));

    expect(timelineUtils.calculateTotalCredits2).toHaveBeenCalledWith(
      state.semesterCourses,
      state.semesters,
      state.coursePools,
      remainingCourses,
      state.courseInstanceMap,
      state.allCourses,
    );
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: {
        totalCredits: 30,
        hasUnmetPrerequisites: false,
      },
    });
  });

  it('should dispatch unmetPrereqFound as true if returned', () => {
    jest.spyOn(timelineUtils, 'calculateTotalCredits2').mockReturnValue({ total: 15, unmetPrereqFound: true });

    const state = {
      semesterCourses: [],
      semesters: [],
      coursePools: [],
      courseInstanceMap: {},
      allCourses: [],
    };
    const remainingCourses = [];

    renderHook(() => useCalculateTotalCredits(state, mockDispatch, remainingCourses));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: {
        totalCredits: 15,
        hasUnmetPrerequisites: true,
      },
    });
  });

  it('should re-run effect when dependencies change', () => {
    const spy = jest
      .spyOn(timelineUtils, 'calculateTotalCredits2')
      .mockReturnValue({ total: 10, unmetPrereqFound: false });

    let state = {
      semesterCourses: ['course1'],
      semesters: ['Fall'],
      coursePools: [],
      courseInstanceMap: {},
      allCourses: ['course1'],
    };
    const remainingCourses = [];

    const { rerender } = renderHook(({ s }) => useCalculateTotalCredits(s, mockDispatch, remainingCourses), {
      initialProps: { s: state },
    });

    expect(spy).toHaveBeenCalledTimes(1);

    // Change dependency
    state = { ...state, semesterCourses: ['course1', 'course2'] };
    rerender({ s: state });

    expect(spy).toHaveBeenCalledTimes(2);
  });
});
