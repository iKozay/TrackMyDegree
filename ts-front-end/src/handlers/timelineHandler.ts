import type {
    CourseStatusValue,
    TimelineState,
    Course,
    Semester,
    CourseCode,
    SemesterId,
} from "../types/timeline.types";
import { getCourseValidationMessage } from "../utils/timelineUtils";

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
        timelineName: string;
        degree: TimelineState["degree"];
        pools: TimelineState["pools"];
        courses: TimelineState["courses"];
        semesters: TimelineState["semesters"];
    },
): TimelineState {
    return {
        timelineName: payload.timelineName,
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
    payload: { courseId: CourseCode | null },
): TimelineState {
    return {
        ...state,
        selectedCourse: payload.courseId,
    };
}

export function moveFromPoolToSemester(
    state: TimelineState,
    payload: { courseId: CourseCode; toSemesterId: SemesterId },
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
    },
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
    payload: { courseId: CourseCode; semesterId: SemesterId },
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
    payload: { open: boolean; type: string },
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
    },
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
    payload: { courseId: CourseCode; type: string },
): TimelineState {
    const { courseId, type } = payload;

    let poolName: string | null = null;
    if (type === "exemption") {
        poolName = "exemptions";
    } else if (type === "deficiency") {
        poolName = "deficiencies";
    }

    if (!poolName) return state;

    const course = state.courses[courseId];
    if (!course) return state;

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

    if (!poolsChanged) return state;

    // -----------------------------
    // Update course status
    // -----------------------------
    let updatedCourse: Course = course;
    if (type === "exemption") {
        updatedCourse = {
            ...course,
            status: {
                status: "completed",
                semester: null,
            },
        };
    } else if (type === "deficiency") {
        updatedCourse = {
            ...course,
            status: {
                status: "incomplete",
                semester: null,
            },
        };
    }

    const updatedCourses = {
        ...state.courses,
        [courseId]: updatedCourse,
    };

    // -----------------------------
    // Final state
    // -----------------------------
    return {
        ...state,
        pools: updatedPools,
        courses: updatedCourses,
    };
}

export function removeCourse(
    state: TimelineState,
    payload: { courseId: CourseCode; type: string },
): TimelineState {
    const { courseId, type } = payload;

    let poolName: string | null = null;
    if (type === "exemption") {
        poolName = "exemptions";
    } else if (type === "deficiency") {
        poolName = "deficiencies";
    }

    if (!poolName) return state;

    const course = state.courses[courseId];
    if (!course) return state;

    let poolsChanged = false;

    const updatedPools = state.pools.map((pool) => {
        if (pool.name !== poolName) return pool;
        if (!pool.courses.includes(courseId)) return pool;

        poolsChanged = true;
        const credits = course.credits || 0;
        return {
            ...pool,
            courses: pool.courses.filter((c) => c !== courseId),
            creditsRequired: Math.max(0, pool.creditsRequired - credits),
        };
    });

    if (!poolsChanged) return state;

    // Reset course status back to incomplete
    const updatedCourses = {
        ...state.courses,
        [courseId]: {
            ...course,
            status: {
                status: "incomplete" as const,
                semester: null,
            },
        },
    };

    return {
        ...state,
        pools: updatedPools,
        courses: updatedCourses,
    };
}

export function addSemester(state: TimelineState): TimelineState {
    const s1 = withPushedHistory(state);

    // Find the last *regular* semester (FALL, WINTER, SUMMER), ignoring FALL/WINTER combined semesters,
    // so that FALL/WINTER semesters don't affect the regular progression.
    const lastRegularSemester: Semester | undefined = [...s1.semesters]
        .reverse()
        .find((s) => !s.term.startsWith("FALL/WINTER"));

    if (!lastRegularSemester) return state;

    const parts = lastRegularSemester.term.split(" ");
    const season = parts[0]; // "FALL", "WINTER", or "SUMMER"
    const year = Number.parseInt(parts[1], 10);

    if (Number.isNaN(year)) return state;

    let newTerm: SemesterId;
    if (season === "FALL") newTerm = `WINTER ${year + 1}`;
    else if (season === "WINTER") newTerm = `SUMMER ${year}`;
    else if (season === "SUMMER") newTerm = `FALL ${year}`;
    else return state;

    // Guard: don't add if it already exists
    if (s1.semesters.some((s) => s.term === newTerm)) return state;

    const newSemester: Semester = {
        term: newTerm,
        courses: [],
    };

    return {
        ...s1,
        semesters: [...s1.semesters, newSemester],
    };
}

/**
 * Derive the FALL start-year for a FALL/WINTER semester from the nearest
 * regular neighbours.  Returns `null` when no neighbour exists at all
 * (caller should keep the existing term).
 *
 * Rules:
 *   FALL  Y precedes  → fallYear = Y
 *   WINTER/SUMMER Y precedes + FALL  Y' follows → fallYear = Y'
 *   WINTER/SUMMER Y precedes + no FALL follows  → fallYear = Y
 *   No preceding + FALL  Y' follows              → fallYear = Y'
 *   No preceding + WINTER/SUMMER Y' follows      → fallYear = Y' - 1
 */
function deriveFallYear(
    prevRegular: Semester | undefined,
    nextRegular: Semester | undefined,
): number | null {
    if (prevRegular) {
        const [prevSeason, prevYearStr] = prevRegular.term.split(" ");
        const prevYear = Number.parseInt(prevYearStr, 10);

        // FALL Y directly precedes — the FALL/WINTER starts in that same year
        if (prevSeason === "FALL") return prevYear;

        // WINTER/SUMMER Y precedes — look ahead for the next FALL to confirm
        if (nextRegular) {
            const [nextSeason, nextYearStr] = nextRegular.term.split(" ");
            const nextYear = Number.parseInt(nextYearStr, 10);
            return nextSeason === "FALL" ? nextYear : nextYear - 1;
        }

        // No following regular — stay in the same year as the preceding semester
        return prevYear;
    }

    if (nextRegular) {
        // No preceding regular — derive entirely from the first following regular
        const [nextSeason, nextYearStr] = nextRegular.term.split(" ");
        const nextYear = Number.parseInt(nextYearStr, 10);
        return nextSeason === "FALL" ? nextYear : nextYear - 1;
    }

    // No regular semesters at all
    return null;
}

/**
 * After reordering, only the FALL/WINTER semester's year needs to be updated
 * based on its new neighbours. All regular semesters (FALL/WINTER/SUMMER) keep
 * their original terms unchanged — moving a FALL/WINTER card must never
 * renumber any regular semester.
 */
function rebuildSemesterTerms(semesters: Semester[]): Semester[] {
    if (semesters.length === 0) return [];

    return semesters.map((sem, idx) => {
        // Regular semesters are never renumbered
        if (!sem.term.startsWith("FALL/WINTER")) return sem;

        const prevRegular = semesters
            .slice(0, idx)
            .reverse()
            .find((s) => !s.term.startsWith("FALL/WINTER"));

        const nextRegular = semesters
            .slice(idx + 1)
            .find((s) => !s.term.startsWith("FALL/WINTER"));

        const fallYear = deriveFallYear(prevRegular, nextRegular);
        if (fallYear === null) return sem;

        const shortYear = (fallYear + 1) % 100;
        const shortYearStr = shortYear.toString().padStart(2, "0");
        const newTerm = `FALL/WINTER ${fallYear}-${shortYearStr}` as SemesterId;
        return { ...sem, term: newTerm };
    });
}

export function moveSemester(
    state: TimelineState,
    payload: { fromIndex: number; toIndex: number },
): TimelineState {
    const { fromIndex, toIndex } = payload;
    if (fromIndex === toIndex) return state;

    const s1 = withPushedHistory(state);
    const semesters = [...s1.semesters];

    if (fromIndex < 0 || fromIndex >= semesters.length) return state;
    if (toIndex < 0 || toIndex >= semesters.length) return state;

    // Reorder
    const [moved] = semesters.splice(fromIndex, 1);
    semesters.splice(toIndex, 0, moved);

    // Recompute all terms based on new ordering
    const recomputed = rebuildSemesterTerms(semesters);

    // Update course semester references: old term → new term for affected semesters
    const termMap = new Map<SemesterId, SemesterId>();
    for (let i = 0; i < semesters.length; i++) {
        const oldTerm = semesters[i].term;
        const newTerm = recomputed[i].term;
        if (oldTerm !== newTerm) termMap.set(oldTerm, newTerm);
    }

    let updatedCourses = s1.courses;
    if (termMap.size > 0) {
        const entries = Object.entries(s1.courses).map(([code, course]) => {
            const oldSem = course.status.semester;
            if (oldSem && termMap.has(oldSem)) {
                return [code, {
                    ...course,
                    status: { ...course.status, semester: termMap.get(oldSem)! },
                }] as const;
            }
            return [code, course] as const;
        });
        updatedCourses = Object.fromEntries(entries);
    }

    return {
        ...s1,
        semesters: recomputed,
        courses: updatedCourses,
    };
}

export function addFallWinterSemester(state: TimelineState): TimelineState {
    const s1 = withPushedHistory(state);

    // Use the last regular semester to anchor the FALL year
    const lastRegular = [...s1.semesters]
        .reverse()
        .find((s) => !s.term.startsWith("FALL/WINTER"));

    const lastSemester: Semester | undefined = s1.semesters.at(-1);
    if (!lastSemester) return state;

    const parts = lastSemester.term.split(" ");
    const season = parts[0];
    const year = Number.parseInt(parts[1], 10);

    if (Number.isNaN(year)) return state;

    // Determine which fall year the new FALL/WINTER semester should start in
    let fallYear: number;
    if (lastRegular) {
        const [, lYear] = lastRegular.term.split(" ");
        fallYear = Number.parseInt(lYear, 10); // FALL Y, WINTER Y, or SUMMER Y → FALL/WINTER Y-(Y+1)
    } else if (season === "FALL/WINTER") {
        fallYear = year + 1;
    } else {
        fallYear = year;
    }

    const shortYear = (fallYear + 1) % 100;
    const shortYearStr = shortYear.toString().padStart(2, "0");
    const newTerm = `FALL/WINTER ${fallYear}-${shortYearStr}` as SemesterId;

    // Guard: don't add if it already exists
    if (s1.semesters.some((s) => s.term === newTerm)) return state;

    const newSemester: Semester = {
        term: newTerm,
        courses: [],
    };

    return {
        ...s1,
        semesters: [...s1.semesters, newSemester],
    };
}

export function validateTimeline(state: TimelineState): TimelineState {
  const updatedSemesters = state.semesters.map((semester) => ({
    ...semester,
    courses: semester.courses.map((sc) => {
      const course = state.courses[sc.code];
      if (!course) return sc;

      return {
        ...sc,
        message: getCourseValidationMessage(course, state),
      };
    }),
  }));

  return {
    ...state,
    semesters: updatedSemesters,
  };
}
