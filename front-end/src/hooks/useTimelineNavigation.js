
import { useCallback } from "react";
import { decompressTimeline } from '../components/CompressDegree';

export const useTimelineNavigation = (state, dispatch) => {

    const handleUndo = useCallback(() => {
        if (state.history.length === 0) return;

        const prevTimelineString = state.history[state.history.length - 1];
        const [decompressedTimeline] = decompressTimeline(prevTimelineString);

        dispatch({
            type: "SET",
            payload: {
                semesterCourses: decompressedTimeline,
                timelineStringa: prevTimelineString,
                history: state.history.slice(0, -1),
                future: [state.timelineString, ...state.future],
            },
        });
    }, [state.history, state.timelineString, state.future, dispatch]);

    const handleRedo = useCallback(() => {
        if (state.future.length === 0) return;

        const nextTimelineString = state.future[0];
        const [decompressedTimeline] = decompressTimeline(nextTimelineString);

        dispatch({
            type: "SET",
            payload: {
                semesterCourses: decompressedTimeline,
                timelineString: nextTimelineString,
                history: [...state.history, state.timelineString],
                future: state.future.slice(1),
            },
        });
    }, [state.future, state.history, state.timelineString, dispatch]);

    return { handleUndo, handleRedo };
};
