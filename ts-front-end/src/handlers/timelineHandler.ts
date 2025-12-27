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

  const semesterIndex = s1.semesters.findIndex((s) => s.term === toSemesterId);

  if (semesterIndex === -1) return s1;

  const semester = s1.semesters[semesterIndex];

  if (semester.courses.some((c) => c.code === courseId)) return s1;

  const updatedSemesters = [...s1.semesters];
  updatedSemesters[semesterIndex] = {
    ...semester,
    courses: [...semester.courses, { code: courseId, message: "" }],
  };

  return {
    ...s1,
    semesters: updatedSemesters,
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

  const fromIndex = s1.semesters.findIndex((s) => s.term === fromSemesterId);
  const toIndex = s1.semesters.findIndex((s) => s.term === toSemesterId);

  if (fromIndex === -1 || toIndex === -1) return s1;

  const fromSemester = s1.semesters[fromIndex];
  const toSemester = s1.semesters[toIndex];

  if (!fromSemester.courses.some((c) => c.code === courseId)) return s1;

  const updatedSemesters = [...s1.semesters];

  updatedSemesters[fromIndex] = {
    ...fromSemester,
    courses: fromSemester.courses.filter((c) => c.code !== courseId),
  };

  updatedSemesters[toIndex] = {
    ...toSemester,
    courses: toSemester.courses.some((c) => c.code === courseId)
      ? toSemester.courses
      : [...toSemester.courses, { code: courseId, message: "" }],
  };

  return {
    ...s1,
    semesters: updatedSemesters,
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

  const semesterIndex = s1.semesters.findIndex((s) => s.term === semesterId);

  if (semesterIndex === -1) return s1;

  const semester = s1.semesters[semesterIndex];

  if (!semester.courses.some((c) => c.code === courseId)) return s1;

  const updatedSemesters = [...s1.semesters];
  updatedSemesters[semesterIndex] = {
    ...semester,
    courses: semester.courses.filter((c) => c.code !== courseId),
  };

  return {
    ...s1,
    semesters: updatedSemesters,
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
