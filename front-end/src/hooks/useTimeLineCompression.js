import { useEffect } from 'react';
import { compressTimeline } from '../components/CompressDegree';

export const useTimeLineCompression = (state, dispatch, degreeId, credits_Required, extendedCredit) => {
    useEffect(() => {

        if (Object.keys(state.semesterCourses).length <= 1) {
            return;
        }

        const newTimelineString = compressTimeline(state.semesterCourses, degreeId, credits_Required, extendedCredit);
        if (state.timelineString === null) {
            dispatch({ type: 'SET', payload: { timelineString: newTimelineString } });
            return;
        }

        if (state.timelineString === newTimelineString) return;

        dispatch({
            type: 'SET',
            payload: {
                history: [...state.history, state.timelineString],
                future: [],
                timelineString: newTimelineString,
            },
        });
    }, [state.semesterCourses]);
};
