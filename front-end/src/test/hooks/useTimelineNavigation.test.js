import { renderHook, act } from '@testing-library/react';
import { useTimelineNavigation } from '../../hooks/useTimelineNavigation';
import * as CompressDegree from '../../components/CompressDegree';

jest.spyOn(CompressDegree, 'decompressTimeline').mockImplementation((str) => [
    [`decompressed:${str}`],
]);

describe('useTimelineNavigation', () => {
    let state;
    let dispatch;

    beforeEach(() => {
        dispatch = jest.fn();
        state = {
            history: ['timeline1'],
            future: ['timeline2'],
            timelineString: 'timelineCurrent',
        };
    });

    test('handleUndo dispatches SET with correct payload', () => {
        const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

        act(() => {
            result.current.handleUndo();
        });

        expect(dispatch).toHaveBeenCalledWith({
            type: 'SET',
            payload: {
                semesterCourses: ['decompressed:timeline1'],
                timelineStringa: 'timeline1',
                history: [],
                future: ['timelineCurrent', 'timeline2'], // include previous future
            },
        });
    });

    test('handleRedo dispatches SET with correct payload', () => {
        const { result } = renderHook(() => useTimelineNavigation(state, dispatch));

        act(() => {
            result.current.handleRedo();
        });

        expect(dispatch).toHaveBeenCalledWith({
            type: 'SET',
            payload: {
                semesterCourses: ['decompressed:timeline2'],
                timelineString: 'timeline2',
                history: ['timeline1', 'timelineCurrent'], // include previous history
                future: [],
            },
        });
    });
});
