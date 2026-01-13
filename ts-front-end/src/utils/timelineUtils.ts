import type {
  Course,
  CourseCode,
  CourseMap,
  Pool,
  RequisiteGroup,
  SemesterId,
  SemesterList,
  TimelinePartialUpdate,
  TimelineState,
} from "../types/timeline.types";

// Function that checks if a course already exists in a semester
export function canDropCourse(
  course: Course,
  courses: CourseMap,
  semesters: SemesterList,
  fromSemesterId?: SemesterId,
  toSemesterId?: SemesterId
): { allowed: boolean; reason?: string } {
  const targetSemester = semesters.find((s) => s.term === toSemesterId);

  if (targetSemester) {
    const totalCredits = targetSemester.courses.reduce(
      (sum, c) => sum + (courses[c.code]?.credits ?? 0),
      0
    );

    const projectedCredits = totalCredits + (course.credits ?? 0);

    if (projectedCredits > 19) {
      return {
        allowed: false,
        reason: "Semester credit limit exceeded (max 19 credits)",
      };
    }
  }

  const currentSemester = course.status.semester;

  // Case 1: course not assigned anywhere → OK
  if (!currentSemester) {
    return { allowed: true };
  }

  // Case 2: moving within the same semester → OK
  if (fromSemesterId && currentSemester === fromSemesterId) {
    return { allowed: true };
  }

  // Case 3: course exists in a DIFFERENT semester → BLOCK
  return {
    allowed: false,
    reason: `Course already in ${currentSemester}`,
  };
}

export function calculateEarnedCredits(courses: CourseMap): number {
  return Object.values(courses).reduce((total, course) => {
    if (course.status.status === "completed") {
      return total + (course.credits || 0);
    }
    return total;
  }, 0);
}

export function saveTimeline(
  userId: string,
  timelineName: string,
  state: TimelineState
) {
  console.log("Saving timeline for user:", userId, "with name:", timelineName);
  console.log("Timeline state:", state);
  // API call to save the timeline
}

function isCourseSatisfied(
  course: Course | undefined,
  courseSemesterIndex: number,
  semesters: SemesterList
): boolean {
  if (!course) return false;

  if (course.status.status === "completed") return true;

  if (course.status.status !== "planned") return false;

  const prereqSemesterIndex = semesters.findIndex(
    (s) => s.term === course.status.semester
  );

  return (
    prereqSemesterIndex !== -1 && prereqSemesterIndex < courseSemesterIndex
  );
}
function isCourseSatisfiedSameOrBefore(
  course: Course | undefined,
  courseSemesterIndex: number,
  semesters: SemesterList
): boolean {
  if (!course) return false;

  if (course.status.status === "completed") return true;

  if (course.status.status !== "planned") return false;

  const index = semesters.findIndex((s) => s.term === course.status.semester);

  return index !== -1 && index <= courseSemesterIndex;
}
function isRequisiteGroup(req: RequisiteGroup | string): req is RequisiteGroup {
  return typeof req === "object" && req !== null && "anyOf" in req;
}

export function getCourseValidationMessage(
  course: Course,
  state: TimelineState
): string {
  const { semesters, courses } = state;

  const courseSemesterId = course.status.semester;
  if (!courseSemesterId) return "";

  const courseSemesterIndex = semesters.findIndex(
    (s) => s.term === courseSemesterId
  );
  if (courseSemesterIndex === -1) return "";

  /* ---------------- PREREQUISITES ---------------- */

  for (const prereqGroup of course.prerequisites ?? []) {
    if (isRequisiteGroup(prereqGroup)) {
      const satisfied = prereqGroup.anyOf.some((code) =>
        isCourseSatisfied(courses[code], courseSemesterIndex, semesters)
      );

      if (!satisfied) {
        return `Prerequisite (${prereqGroup.anyOf.join(" or ")}) not met`;
      }
    }
  }

  /* ---------------- COREQUISITES ---------------- */
  for (const coreqGroup of course.corequisites ?? []) {
    if (isRequisiteGroup(coreqGroup)) {
      const satisfied = coreqGroup.anyOf.some((code) =>
        isCourseSatisfiedSameOrBefore(
          courses[code],
          courseSemesterIndex,
          semesters
        )
      );

      if (!satisfied) {
        return `Corequisite (${coreqGroup.anyOf.join(" or ")}) not met`;
      }
    }
  }

  return "";
}

function getPoolCourses(
  pools: Pool[],
  id: "Exemptions" | "Deficiencies"
): CourseCode[] {
  return pools.find((p) => p._id === id)?.courses ?? [];
}

export function computeTimelinePartialUpdate(
  prev: TimelineState,
  curr: TimelineState
): TimelinePartialUpdate | null {
  const update: TimelinePartialUpdate = {};

  /* ---------- EXEMPTIONS ---------- */
  const prevEx = [...getPoolCourses(prev.pools, "Exemptions")].sort();
  const currEx = [...getPoolCourses(curr.pools, "Exemptions")].sort();

  if (JSON.stringify(prevEx) !== JSON.stringify(currEx)) {
    update.exemptions = currEx;
  }

  /* ---------- DEFICIENCIES ---------- */
  const prevDef = [...getPoolCourses(prev.pools, "Deficiencies")].sort();
  const currDef = [...getPoolCourses(curr.pools, "Deficiencies")].sort();

  if (JSON.stringify(prevDef) !== JSON.stringify(currDef)) {
    update.deficiencies = currDef;
  }

  /* ---------- COURSES (only those that changed) ---------- */
  const changedCourses: TimelinePartialUpdate["courses"] = {};

  for (const code in curr.courses) {
    const p = prev.courses[code];
    const c = curr.courses[code];

    if (!p) continue;

    if (
      p.status.status !== c.status.status ||
      p.status.semester !== c.status.semester
    ) {
      changedCourses[code] = c;
    }
  }

  if (Object.keys(changedCourses).length > 0) {
    update.courses = changedCourses;
  }

  /* ---------- SEMESTERS (structure changed) ---------- */
  if (prev.semesters !== curr.semesters) {
    update.semesters = curr.semesters;
  }

  return Object.keys(update).length > 0 ? update : null;
}
