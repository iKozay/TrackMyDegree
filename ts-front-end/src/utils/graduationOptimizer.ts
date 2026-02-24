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
