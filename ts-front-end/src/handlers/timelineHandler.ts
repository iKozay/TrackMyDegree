import type {
  CourseStatusValue,
  TimelineState,
  Course,
  Semester,
  CourseCode,
  SemesterId,
} from "../types/timeline.types";

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
    degree: TimelineState["degree"];
    pools: TimelineState["pools"];
    courses: TimelineState["courses"];
    semesters: TimelineState["semesters"];
  }
): TimelineState {
  return {
    degree: payload.degree,
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

export function changeCourseStatus(
  state: TimelineState,
  payload: {
    courseId: CourseCode;
    status: CourseStatusValue;
  }
): TimelineState {
  const s1 = withPushedHistory(state);
  const { courseId, status } = payload;

  const course = s1.courses[courseId];
  if (!course) return s1;

  // -------- COMPLETED --------
  if (status === "completed") {
    return {
      ...s1,
      courses: {
        ...s1.courses,
        [courseId]: {
          ...course,
          status: {
            ...course.status,
            status: "completed",
          },
        },
      },
    };
  }

  // -------- INCOMPLETE --------
  // Remove from any semester if present
  const updatedSemesters = s1.semesters.map((semester) => {
    if (!semester.courses.some((c) => c.code === courseId)) {
      return semester;
    }

    return {
      ...semester,
      courses: semester.courses.filter((c) => c.code !== courseId),
    };
  });

  return {
    ...s1,
    semesters: updatedSemesters,
    courses: {
      ...s1.courses,
      [courseId]: {
        ...course,
        status: {
          ...course.status,
          status: "incomplete",
          semester: null,
        },
      },
    },
  };
}
export function addCourse(
  state: TimelineState,
  payload: { courseId: CourseCode; type: string }
): TimelineState {
  const { courseId, type } = payload;

  const poolName =
    type === "exemption"
      ? "Exemptions"
      : type === "deficiency"
      ? "Deficiencies"
      : null;

  console.log("Adding course", courseId, "as", type);
  if (!poolName) return state;
  console.log("Target pool:", poolName);
  console.log("Current courses:", state.courses);

  const course = state.courses[courseId];
  if (!course) return state;

  console.log("Course found:", course);

  // -----------------------------
  // Update pools
  // -----------------------------
  let poolsChanged = false;

  const updatedPools = state.pools.map((pool) => {
    if (pool.name !== poolName) return pool;

    if (pool.courses.includes(courseId)) {
      return pool;
    }

    poolsChanged = true;
    const credits = course.credits || 0;
    return {
      ...pool,
      courses: [...pool.courses, courseId],
      creditsRequired: pool.creditsRequired + credits,
    };
  });
  console.log("Pools:", updatedPools);
  if (!poolsChanged) return state;

  // -----------------------------
  // Update course status
  // -----------------------------
  const updatedCourse: Course =
    type === "exemption"
      ? {
          ...course,
          status: {
            status: "completed",
            semester: null,
          },
        }
      : course;

  const updatedCourses = {
    ...state.courses,
    [courseId]: updatedCourse,
  };

  console.log("Courses:", updatedCourse);

  // -----------------------------
  // Final state
  // -----------------------------
  return {
    ...state,
    pools: updatedPools,
    courses: updatedCourses,
  };
}

export function addSemester(state: TimelineState): TimelineState {
  const s1 = withPushedHistory(state);

  const lastSemester: Semester | undefined = s1.semesters.at(-1);
  if (!lastSemester) return state;

  const [season, yearStr] = lastSemester.term.split(" ");
  const year = Number.parseInt(yearStr, 10);
  const order = ["FALL", "WINTER", "SUMMER"];
  const index = order.indexOf(season);

  // Check if invalid semester
  if (index === -1 || Number.isNaN(year)) return state;

  let newTerm: SemesterId;
  if (season === "FALL") newTerm = `WINTER ${year + 1}`;
  else if (season === "WINTER") newTerm = `SUMMER ${year}`;
  else if (season === "SUMMER") newTerm = `FALL ${year}`;
  else return state;

  const newSemester = {
    term: newTerm,
    courses: [] as { code: CourseCode; message: string }[],
  };

  return {
    ...s1,
    semesters: [...s1.semesters, newSemester],
  };
}
