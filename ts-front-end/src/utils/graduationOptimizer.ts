import type {
  TimelineState,
  Course,
  Semester,
  SemesterId,
  CourseMap,
} from "../types/timeline.types";

const MAX_CREDITS_PER_SEMESTER = 19;
const MAX_EXTRA_SEMESTERS = 24;

// Pool keywords that are NOT degree requirements
const SPECIAL_POOL_KEYWORDS = ["exemption", "deficien", "used-unused", "coop"];

export interface OptimizerResult {
  semesters: Semester[];
  courses: CourseMap;
  placedCount: number;
  unplacedCount: number;
  newSemesterCount: number;
  estimatedGraduation: SemesterId | null;
}

function getSeasonFromTerm(term: string): string {
  return term.split(" ")[0].toUpperCase();
}

/**
 * Returns true if the course is offered during the given semester's season.
 * Handles both 'fall' and 'FALL 2025' formats in offeredIN.
 */
function isOfferedIn(course: Course, term: SemesterId): boolean {
  if (!course.offeredIN || course.offeredIN.length === 0) return true;
  const season = getSeasonFromTerm(term);
  return course.offeredIN.some(
    (offered) => offered.split(" ")[0].toUpperCase() === season
  );
}

/**
 * Returns true if all prerequisite groups are satisfied.
 * A group is satisfied if at least one course in it is:
 *   - completed, OR
 *   - planned in a semester that comes BEFORE semesterIndex
 */
function arePrereqsSatisfied(
  course: Course,
  semesterIndex: number,
  semesters: Semester[],
  courseMap: CourseMap
): boolean {
  const prereqs = course.prerequisites;
  if (!prereqs || typeof prereqs === "string" || prereqs.length === 0)
    return true;

  return prereqs.every((group) => {
    if (group.anyOf.length === 0) return true;
    return group.anyOf.some((prereqCode) => {
      const prereq = courseMap[prereqCode];
      if (!prereq) return true;
      if (prereq.status.status === "completed") return true;
      if (prereq.status.status === "planned" && prereq.status.semester) {
        const prereqSemIdx = semesters.findIndex(
          (s) => s.term === prereq.status.semester
        );
        return prereqSemIdx !== -1 && prereqSemIdx < semesterIndex;
      }
      return false;
    });
  });
}
