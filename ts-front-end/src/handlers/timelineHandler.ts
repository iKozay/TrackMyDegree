import type { TimelineState } from "../types/timeline.types";
import type { CourseCode, SemesterId } from "../types/timeline.types";

type Snapshot = {
  courses: TimelineState["courses"];
  semesters: TimelineState["semesters"];
};

// TODO : Add more handles saveTimeLine, addExemption...
// TODO : Create utils functions for non state update
//  like calculateEarnedCredits... (/utils)
function createSnapshot(state: TimelineState): Snapshot {
  return {
    courses: state.courses,
    semesters: state.semesters,
  };
}

export function withPushedHistory(state: TimelineState): TimelineState {
  const snapshot = createSnapshot(state);
  return {
    ...state,
    history: [...state.history, snapshot],
    future: [],
  };
}

export function initTimelineState(
  _state: TimelineState,
  payload: {
    pools: TimelineState["pools"];
    courses: TimelineState["courses"];
    semesters: TimelineState["semesters"];
  }
): TimelineState {
  return {
    pools: payload.pools,
    courses: payload.courses,
    semesters: payload.semesters,
    selectedCourse: null,
    history: [],
    future: [],
    modal: {
      open: false,
      type: "",
    },
  };
}

export function selectCourse(
  state: TimelineState,
  payload: { courseId: CourseCode | null }
): TimelineState {
  return {
    ...state,
    selectedCourse: payload.courseId,
  };
}

export function moveFromPoolToSemester(
  state: TimelineState,
  payload: { courseId: CourseCode; toSemesterId: SemesterId }
): TimelineState {
  const s1 = withPushedHistory(state);
  const { courseId, toSemesterId } = payload;

  const current = s1.semesters[toSemesterId] ?? [];
  if (current.includes(courseId)) return s1;

  return {
    ...s1,
    semesters: {
      ...s1.semesters,
      [toSemesterId]: [...current, courseId],
    },
    courses: {
      ...s1.courses,
      [courseId]: {
        ...s1.courses[courseId],
        status: {
          ...s1.courses[courseId].status,
          status: "planned",
          semester: toSemesterId,
        },
      },
    },
  };
}

export function moveBetweenSemesters(
  state: TimelineState,
  payload: {
    courseId: CourseCode;
    fromSemesterId: SemesterId;
    toSemesterId: SemesterId;
  }
): TimelineState {
  const { courseId, fromSemesterId, toSemesterId } = payload;
  if (fromSemesterId === toSemesterId) return state;

  const s1 = withPushedHistory(state);
  const fromList = s1.semesters[fromSemesterId] ?? [];
  const toList = s1.semesters[toSemesterId] ?? [];

  if (!fromList.includes(courseId)) return s1;

  const newFrom = fromList.filter((c) => c !== courseId);
  const newTo = toList.includes(courseId) ? toList : [...toList, courseId];

  return {
    ...s1,
    semesters: {
      ...s1.semesters,
      [fromSemesterId]: newFrom,
      [toSemesterId]: newTo,
    },
    courses: {
      ...s1.courses,
      [courseId]: {
        ...s1.courses[courseId],
        status: {
          ...s1.courses[courseId].status,
          status: "planned",
          semester: toSemesterId,
        },
      },
    },
  };
}

export function removeFromSemester(
  state: TimelineState,
  payload: { courseId: CourseCode; semesterId: SemesterId }
): TimelineState {
  const s1 = withPushedHistory(state);
  const { courseId, semesterId } = payload;

  const list = s1.semesters[semesterId] ?? [];

  return {
    ...s1,
    semesters: {
      ...s1.semesters,
      [semesterId]: list.filter((c) => c !== courseId),
    },
    courses: {
      ...s1.courses,
      [courseId]: {
        ...s1.courses[courseId],
        status: {
          ...s1.courses[courseId].status,
          status: "incomplete",
          semester: null,
        },
      },
    },
  };
}

export function undo(state: TimelineState): TimelineState {
  if (state.history.length === 0) return state;

  const last = state.history[state.history.length - 1];
  const newHistory = state.history.slice(0, -1);
  const current = createSnapshot(state);

  return {
    ...state,
    courses: last.courses,
    semesters: last.semesters,
    history: newHistory,
    future: [...state.future, current],
  };
}

export function redo(state: TimelineState): TimelineState {
  if (state.future.length === 0) return state;

  const next = state.future[state.future.length - 1];
  const newFuture = state.future.slice(0, -1);
  const current = createSnapshot(state);

  return {
    ...state,
    courses: next.courses,
    semesters: next.semesters,
    future: newFuture,
    history: [...state.history, current],
  };
}

export function openModal(
  state: TimelineState,
  payload: { open: boolean; type: string }
): TimelineState {
  return {
    ...state,
    modal: { open: payload.open, type: payload.type },
  };
}
