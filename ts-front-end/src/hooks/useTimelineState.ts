import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Dispatch } from "react";

import { timelineReducer } from "../reducers/timelineReducer";
import { TimelineActionConstants } from "../types/actions";
import { computeTimelinePartialUpdate } from "../utils/timelineUtils";
import type {
  TimelineState,
  TimelineActionType,
  CourseCode,
  SemesterId,
  TimelineJobResponse,
  JobStatus,
  Pool,
  CourseMap,
  SemesterList,
  CourseStatusValue,
  Degree,
} from "../types/timeline.types";
import { api } from "../api/http-api-client.ts";

type TimelineDispatch = Dispatch<TimelineActionType>;

export interface TimelineActions {
  initTimelineState: (
    timelineName: string,
    degree: Degree,
    pools: Pool[],
    courses: CourseMap,
    semesters: SemesterList,
  ) => void;
  selectCourse: (courseId: CourseCode | null) => void;
  moveFromPoolToSemester: (
    courseId: CourseCode,
    toSemesterId: SemesterId,
  ) => void;
  moveBetweenSemesters: (
    courseId: CourseCode,
    fromSemesterId: SemesterId,
    toSemesterId: SemesterId,
  ) => void;
  removeFromSemester: (courseId: CourseCode, semesterId: SemesterId) => void;
  undo: () => void;
  redo: () => void;
  openModal: (open: boolean, type: string) => void;
  changeCourseStatus: (courseId: CourseCode, status: CourseStatusValue) => void;
  addCourse: (courseId: CourseCode, type: string) => void;
  addSemester: () => void;
  setTimelineName: (timelineName: string) => void;
}

export interface UseTimelineStateResult {
  status: JobStatus;
  state: TimelineState;
  actions: TimelineActions;
  canUndo: boolean;
  canRedo: boolean;
  errorMessage: string | null;
}

const EMPTY_TIMELINE_STATE: TimelineState = {
  timelineName: "",
  degree: {
    name: "",
    totalCredits: 0,
    coursePools: [],
  },
  pools: [],
  courses: {},
  semesters: [],
  selectedCourse: null,
  history: [],
  future: [],
  modal: {
    open: false,
    type: "",
  },
};
function createTimelineActions(dispatch: TimelineDispatch): TimelineActions {
  return {
    initTimelineState(timelineName, degree, pools, courses, semesters) {
      dispatch({
        type: TimelineActionConstants.Init,
        payload: { timelineName, degree, pools, courses, semesters },
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
    changeCourseStatus(courseId, status) {
      dispatch({
        type: TimelineActionConstants.ChangeCourseStatus,
        payload: { courseId, status },
      });
    },
    addCourse(courseId, type) {
      dispatch({
        type: TimelineActionConstants.AddCourse,
        payload: { courseId, type },
      });
    },
    addSemester() {
      dispatch({
        type: TimelineActionConstants.AddSemester,
      });
    },
    setTimelineName(timelineName: string) {
      dispatch({
        type: TimelineActionConstants.SetTimelineName,
        payload: { timelineName },
      });
    },
  };
}

export function useTimelineState(jobId?: string): UseTimelineStateResult {
  const [status, setStatus] = useState<JobStatus>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [state, dispatch] = useReducer(timelineReducer, EMPTY_TIMELINE_STATE);

  const actions = useMemo(() => createTimelineActions(dispatch), [dispatch]);
  // const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // const mountedRef = useRef(true);

  useEffect(() => {
    if (!jobId || initialized) return;

    let cancelled = false;
    const start = Date.now();

    const fetchResult = async (): Promise<void> => {
      if (cancelled || Date.now() - start > 60_000) {
        if (!cancelled) {
          setStatus("failed");
          setErrorMessage("Processing is taking too long. Please try again.");
        }
        return;
      }

      try {
        const data = await api.get<TimelineJobResponse>(`/jobs/${jobId}`);
        if (cancelled) return;

        if (data.status === "done" && data.result) {
          const { degree, pools, courses, semesters } = data.result;
          actions.initTimelineState(
            data.result.timelineName ?? "",
            degree,
            pools,
            courses,
            semesters,
          );
          setInitialized(true);
          setStatus("done");
          return;
        }

        if (data.status === "processing") {
          await new Promise((r) => setTimeout(r, 1_500));
          return await fetchResult();
        }
        if (data.status !== "failed") {
          setStatus("failed");
          setErrorMessage("Job failed. Please try again.");
          return;
        }

        setStatus("failed");
        setErrorMessage("Job failed. Please try again.");
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setErrorMessage(
          err instanceof Error && err.message.includes("HTTP 410")
            ? "Timeline generation expired. Please try again."
            : "Unable to reach server. Please try again.",
        );
      }
    };

    fetchResult();

    return () => {
      cancelled = true;
    };
  }, [jobId, initialized, actions]);
  const prevStateRef = useRef<TimelineState | null>(null);

  useEffect(() => {
    if (!jobId || !initialized) return;

    const prev = prevStateRef.current;
    if (!prev) {
      prevStateRef.current = state;
      return;
    }

    const update = computeTimelinePartialUpdate(prev, state);

    if (update) {
      api.post(`/jobs/${jobId}`, update).catch((err) => {
        console.error("Failed to sync timeline update", err);
      });
    }

    prevStateRef.current = state;
  }, [state, jobId, initialized]);

  const canUndo = state.history.length > 0;
  const canRedo = state.future.length > 0;

  return {
    status,
    state,
    actions,
    canUndo,
    canRedo,
    errorMessage,
  };
}
