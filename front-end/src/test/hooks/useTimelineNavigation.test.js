// useTimelineNavigation.test.js
import { renderHook, act } from '@testing-library/react';
import { useTimelineNavigation } from '../../hooks/useTimelineNavigation';
import { decompressTimeline } from '../../components/CompressDegree';

// Mock decompressTimeline
jest.mock('../../components/CompressDegree', () => ({
  decompressTimeline: jest.fn(),
}));

describe('useTimelineNavigation', () => {
  let state;
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    state = {
      timelineString: 'currentTimeline',
      history: ['history1', 'history2'],
      future: ['future1', 'future2'],
    };
    decompressTimeline.mockClear();
  });

  describe('handleUndo', () => {
    it('should do nothing if history is empty', () => {
      state.history = [];
      const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

      act(() => {
        result.current.handleUndo();
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should undo last history item', () => {
      decompressTimeline.mockReturnValueOnce([['courseA', 'courseB']]); // decompressed timeline
      const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

      act(() => {
        result.current.handleUndo();
      });

      expect(decompressTimeline).toHaveBeenCalledWith('history2');
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET',
        payload: {
          semesterCourses: ['courseA', 'courseB'],
          timelineString: 'history2',
          history: ['history1'],
          future: ['currentTimeline', 'future1', 'future2'],
        },
      });
    });
  });

  describe('handleRedo', () => {
    it('should do nothing if future is empty', () => {
      state.future = [];
      const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

      act(() => {
        result.current.handleRedo();
      });

      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should redo first future item', () => {
      decompressTimeline.mockReturnValueOnce([['courseX', 'courseY']]); // decompressed timeline
      const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

      act(() => {
        result.current.handleRedo();
      });

      expect(decompressTimeline).toHaveBeenCalledWith('future1');
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET',
        payload: {
          semesterCourses: ['courseX', 'courseY'],
          timelineString: 'future1',
          history: ['history1', 'history2', 'currentTimeline'],
          future: ['future2'],
        },
      });
    });
  });
});
