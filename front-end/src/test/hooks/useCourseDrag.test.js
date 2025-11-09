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
        mockState.courseInstanceMap,
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
        }),
      );
    });
  });

  test('should handle drag end when dropped over a valid target', () => {
    const mockStateWithSemesters = {
      ...mockState,
      semesters: [{ id: 's1', name: 'Fall 2025' }],
      semesterCourses: { s1: [] },
      allCourses: [{ _id: 'COMP101', credits: 3 }],
      uniqueIdCounter: 0,
    };

    timelineUtils.findSemesterIdByCourseCode.mockReturnValue('s1');
    timelineUtils.calculateSemesterCredits.mockReturnValue(3);
    timelineUtils.getMaxCreditsForSemesterName.mockReturnValue(18);
    timelineUtils.removeCourseFromSemester.mockReturnValue({ s1: [] });

    const { result } = renderHook(() => useCourseDrag(mockStateWithSemesters, mockDispatch));

    act(() => {
      result.current.handleDragEnd({
        active: {
          id: 'C1',
          data: { current: { courseCode: 'COMP101', containerId: 'courseList' } },
        },
        over: {
          id: 's1',
          data: { current: { containerId: 's1' } },
        },
      });
    });

    expect(mockDispatch).toHaveBeenCalled();
  });

  test('should handle drag end when no over target', () => {
    const documentSpy = jest.spyOn(document, 'querySelector').mockReturnValue({
      classList: { remove: jest.fn() },
    });

    const { result } = renderHook(() => useCourseDrag(mockState, mockDispatch));

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'C1', data: { current: { courseCode: 'COMP101' } } },
        over: null,
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { activeId: null },
    });

    documentSpy.mockRestore();
  });

  test('should handle drag cancel', () => {
    const documentSpy = jest.spyOn(document, 'querySelector').mockReturnValue({
      classList: { remove: jest.fn() },
    });

    const { result } = renderHook(() => useCourseDrag(mockState, mockDispatch));

    act(() => {
      result.current.handleDragCancel();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { activeId: null },
    });

    documentSpy.mockRestore();
  });

  test('should handle return course', () => {
    const mockStateWithCourses = {
      ...mockState,
      semesterCourses: { s1: ['C1'], s2: ['C2'] },
    };

    const { result } = renderHook(() => useCourseDrag(mockStateWithCourses, mockDispatch));

    act(() => {
      result.current.handleReturn('C1');
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET',
        payload: expect.objectContaining({
          returning: true,
          hasUnsavedChanges: true,
        }),
      }),
    );
  });

  test('should handle course select', () => {
    const mockStateWithCourse = {
      ...mockState,
      allCourses: [{ _id: 'COMP101', title: 'Intro to CS' }],
    };

    const { result } = renderHook(() => useCourseDrag(mockStateWithCourse, mockDispatch));

    act(() => {
      result.current.handleCourseSelect('COMP101');
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { selectedCourse: { _id: 'COMP101', title: 'Intro to CS' } },
    });
  });

  test('should handle course select with source prefix', () => {
    const mockStateWithCourse = {
      ...mockState,
      allCourses: [{ _id: 'COMP101', title: 'Intro to CS' }],
    };

    const { result } = renderHook(() => useCourseDrag(mockStateWithCourse, mockDispatch));

    act(() => {
      result.current.handleCourseSelect('source-COMP101');
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { selectedCourse: { _id: 'COMP101', title: 'Intro to CS' } },
    });
  });

  test('should handle drag start with deficiency course', () => {
    const mockStateWithDeficiency = {
      ...mockState,
      deficiencyCourses: [{ _id: 'DEF101', title: 'Deficiency Course' }],
    };

    const { result } = renderHook(() => useCourseDrag(mockStateWithDeficiency, mockDispatch));

    act(() => {
      result.current.handleDragStart({
        active: { id: 'D1', data: { current: { courseCode: 'DEF101' } } },
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET',
        payload: expect.objectContaining({ selectedCourse: { _id: 'DEF101', title: 'Deficiency Course' } }),
      }),
    );
  });
});
