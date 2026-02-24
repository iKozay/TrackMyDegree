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

function nextTerm(current: SemesterId): SemesterId {
  const [season, yearStr] = current.split(" ");
  const year = parseInt(yearStr, 10);
  if (season === "FALL") return `WINTER ${year + 1}` as SemesterId;
  if (season === "WINTER") return `SUMMER ${year}` as SemesterId;
  return `FALL ${year}` as SemesterId; // SUMMER -> FALL same year
}

/**
 * Greedy graduation path optimizer.
 *
 * Fills new semesters with incomplete degree-required courses, respecting:
 *   1. Prerequisites (must be completed or planned in an earlier semester)
 *   2. Course offering seasons (offeredIN field)
 *   3. Max credits per semester (19)
 *
 * Returns a plain OptimizerResult (no side effects — caller decides whether to apply).
 */
export function optimizePath(state: TimelineState): OptimizerResult {
  // 1. Identify special (non-degree) pools
  const specialPoolIds = new Set(
    state.pools
      .filter((p) =>
        SPECIAL_POOL_KEYWORDS.some(
          (kw) =>
            p._id.toLowerCase().includes(kw) ||
            p.name.toLowerCase().includes(kw)
        )
      )
      .map((p) => p._id)
  );
