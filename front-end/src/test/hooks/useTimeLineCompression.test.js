import { renderHook } from '@testing-library/react';
import { useTimeLineCompression } from '../../hooks/useTimeLineCompression';
import { compressTimeline } from '../../components/CompressDegree';

jest.mock('../../components/CompressDegree', () => ({
  compressTimeline: jest.fn(),
}));

describe('useTimeLineCompression', () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    compressTimeline.mockClear();
  });

  it('should not dispatch if semesterCourses has 1 or fewer semesters', () => {
    const state = {
      semesterCourses: { 'Fall 2024': [] },
      timelineString: null,
      history: [],
      future: [],
    };
    renderHook(() => useTimeLineCompression(state, dispatch, 'degree1', 120, false));
    expect(dispatch).not.toHaveBeenCalled();
    expect(compressTimeline).not.toHaveBeenCalled();
  });

  it('should dispatch SET when timelineString is null', () => {
    compressTimeline.mockReturnValue('compressed');
    const state = {
      semesterCourses: { 'Fall 2024': [], 'Winter 2025': [] },
      timelineString: null,
      history: [],
      future: [],
    };
    renderHook(() => useTimeLineCompression(state, dispatch, 'degree1', 120, false));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: { timelineString: 'compressed' },
    });
  });

  it('should not dispatch if timelineString matches compressed value', () => {
    compressTimeline.mockReturnValue('same');
    const state = {
      semesterCourses: { 'Fall 2024': [], 'Winter 2025': [] },
      timelineString: 'same',
      history: [],
      future: [],
    };
    renderHook(() => useTimeLineCompression(state, dispatch, 'degree1', 120, false));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch SET with history and future when timelineString changes', () => {
    compressTimeline.mockReturnValue('newString');
    const state = {
      semesterCourses: { 'Fall 2024': [], 'Winter 2025': [] },
      timelineString: 'oldString',
      history: ['olderString'],
      future: ['futureString'],
    };
    renderHook(() => useTimeLineCompression(state, dispatch, 'degree1', 120, false));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET',
      payload: {
        history: ['olderString', 'oldString'],
        future: [],
        timelineString: 'newString',
      },
    });
  });
});
