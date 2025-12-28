import { useEffect, useReducer, useState } from "react";
import type { Dispatch } from "react";

import { timelineReducer } from "../reducers/timelineReducer";
import { TimelineActionConstants } from "../types/actions";
import type {
  TimelineState,
  TimelineActionType,
  CourseCode,
  SemesterId,
  TimelineJobResponse,
  JobStatus,
  Pool,
  CourseMap,
  SemesterMap,
} from "../types/timeline.types";
import mockPlannerResponse from "../mock/plannerResponse.json";

type TimelineDispatch = Dispatch<TimelineActionType>;

export interface TimelineActions {
  initTimelineState: (
    pools: Pool[],
    courses: CourseMap,
    semesters: SemesterMap
  ) => void;
  selectCourse: (courseId: CourseCode | null) => void;
  moveFromPoolToSemester: (
    courseId: CourseCode,
    toSemesterId: SemesterId
  ) => void;
  moveBetweenSemesters: (
    courseId: CourseCode,
    fromSemesterId: SemesterId,
    toSemesterId: SemesterId
  ) => void;
  removeFromSemester: (courseId: CourseCode, semesterId: SemesterId) => void;
  undo: () => void;
  redo: () => void;
  openModal: (open: boolean, type: string) => void;
  addCourse: (courseId: CourseCode, type: string) => void;
}

export interface UseTimelineStateResult {
  status: JobStatus;
  state: TimelineState;
  actions: TimelineActions;
  canUndo: boolean;
  canRedo: boolean;
}

const EMPTY_TIMELINE_STATE: TimelineState = {
  pools: [],
  courses: {},
  semesters: {},
  selectedCourse: null,
  history: [],
  future: [],
  modal: {
    open: false,
    type: "",
  },
};
// TODO : Add more actions like saveTimeLine, addExemption...
function createTimelineActions(dispatch: TimelineDispatch): TimelineActions {
  return {
    initTimelineState(pools, courses, semesters) {
      dispatch({
        type: TimelineActionConstants.Init,
        payload: { pools, courses, semesters },
      });
    },
    selectCourse(courseId) {
      dispatch({
        type: TimelineActionConstants.SelectCourse,
        payload: { courseId },
      });
    },

    moveFromPoolToSemester(courseId, toSemesterId) {
      dispatch({
        type: TimelineActionConstants.MoveFromPoolToSemester,
        payload: { courseId, toSemesterId },
      });
    },

    moveBetweenSemesters(courseId, fromSemesterId, toSemesterId) {
      dispatch({
        type: TimelineActionConstants.MoveBetweenSemesters,
        payload: { courseId, fromSemesterId, toSemesterId },
      });
    },

    removeFromSemester(courseId, semesterId) {
      dispatch({
        type: TimelineActionConstants.RemoveFromSemester,
        payload: { courseId, semesterId },
      });
    },

    undo() {
      dispatch({ type: TimelineActionConstants.Undo });
    },

    redo() {
      dispatch({ type: TimelineActionConstants.Redo });
    },
    openModal(open, type) {
      dispatch({
        type: TimelineActionConstants.OpenModal,
        payload: { open, type },
      });
    },
    addCourse(courseId, type) {
      dispatch({
        type: TimelineActionConstants.AddCourse,
        payload: { courseId, type },
      });
    },
  };
}

export function useTimelineState(jobId?: string): UseTimelineStateResult {
  const [status, setStatus] = useState<JobStatus>("processing");
  const [initialized, setInitialized] = useState(false);

  const [state, dispatch] = useReducer(timelineReducer, EMPTY_TIMELINE_STATE);

  const actions = createTimelineActions(dispatch);
  useEffect(() => {
    let isMounted = true;

    async function fetchResult() {
      try {
        // For now, just use the local JSON
        const data = mockPlannerResponse as TimelineJobResponse;

        if (!isMounted) return;

        setStatus(data.status);

        if (data.status === "done" && data.result && !initialized) {
          const { pools, courses, semesters } = data.result;

          // THIS is where the reducer gets real data
          actions.initTimelineState(pools, courses, semesters);
          setInitialized(true);
        }
      } catch (err) {
        console.error("Error fetching timeline result:", err);
        if (!isMounted) return;
        setStatus("error");
      }
    }

    // simple one-shot for now; you can re-add polling if you want
    fetchResult();
    // const intervalId = setInterval(fetchResult, 1000);
    return () => {
      isMounted = false;
      // clearInterval(intervalId);
    };
  }, [jobId, initialized, actions]);

  const canUndo = state.history.length > 0;
  const canRedo = state.future.length > 0;

  return {
    status,
    state,
    actions,
    canUndo,
    canRedo,
  };
}
