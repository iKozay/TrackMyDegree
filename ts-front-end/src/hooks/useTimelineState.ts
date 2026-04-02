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
  CourseMap,
  SemesterList,
  CourseStatusValue,
  Degree,
} from "../types/timeline.types";
import { type CoursePoolData } from "@trackmydegree/shared";
import { api } from "../api/http-api-client.ts";

type TimelineDispatch = Dispatch<TimelineActionType>;

export interface TimelineActions {
  initTimelineState: (
    timelineName: string,
    degree: Degree,
    pools: CoursePoolData[],
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
      dispatch({ type: TimelineActionConstants.AddSemester });
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

  const actions = useMemo(() => createTimelineActions(dispatch), []);

  const prevStateRef = useRef<TimelineState | null>(null);
  const cancelledRef = useRef(false);

  // Polling effect — uses a loop instead of recursion, no AbortController
  useEffect(() => {
    if (!jobId || initialized) return;

    cancelledRef.current = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      const start = Date.now();

      while (!cancelledRef.current && Date.now() - start <= 180_000) {
        try {
          const data = await api.get<TimelineJobResponse>(`/jobs/${jobId}`);
          if (cancelledRef.current) return;

          if (data.status === "done" && data.result) {
            const { degree, pools, courses, semesters } = data.result;
            dispatch({
              type: TimelineActionConstants.Init,
              payload: {
                timelineName: data.result.timelineName ?? "",
                degree,
                pools,
                courses,
                semesters,
              },
            });
            // Set the sync baseline to the initialized state so the
            // sync effect doesn't POST the entire initial payload back.
            prevStateRef.current = null; // will be set on next sync render
            setInitialized(true);
            setStatus("done");
            return;
          }

          if (data.status === "failed") {
            setStatus("failed");
            setErrorMessage("Job failed. Please try again.");
            return;
          }
        } catch (err) {
          if (cancelledRef.current) return;
          setStatus("failed");
          setErrorMessage(
            err instanceof Error && err.message.includes("HTTP 410")
              ? "Timeline generation expired. Please try again."
              : "Unable to reach server. Please try again.",
          );
          return;
        }

        await new Promise<void>((resolve) => {
          timerId = setTimeout(() => {
            timerId = null;
            resolve();
          }, 1_500);
        });
      }

      if (!cancelledRef.current) {
        setStatus("failed");
        setErrorMessage("Processing is taking too long. Please try again.");
      }
    };

    poll();

    return () => {
      cancelledRef.current = true;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [jobId, initialized]);

  // Sync effect — skips the first render after init so we don't POST the
  // initial state back to the server
  useEffect(() => {
    if (!jobId || !initialized) return;

    const prev = prevStateRef.current;
    prevStateRef.current = state;

    // Skip the first render after initialization
    if (!prev) return;

    const update = computeTimelinePartialUpdate(prev, state);
    if (update) {
      api.post(`/jobs/${jobId}`, update).catch((err) => {
        console.error("Failed to sync timeline update", err);
        setErrorMessage("Failed to save changes. Please try again.");
      });
    }
  }, [state, jobId, initialized]);

  return {
    status,
    state,
    actions,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    errorMessage,
  };
}
