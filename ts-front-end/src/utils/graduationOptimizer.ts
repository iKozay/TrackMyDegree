import type {
  TimelineState,
  Course,
  Semester,
  SemesterId,
  CourseMap,
  Pool,
} from "../types/timeline.types";

// Max credit load per semester.
// TODO: coop work-term semesters should carry 0 credits — to be refined when
//       isCoop is surfaced in TimelineState.
const MAX_CREDITS_PER_SEMESTER = 19;

// Safety cap on new semesters generated (24 = 8 years × 3 semesters).
const MAX_EXTRA_SEMESTERS = 24;

// Only truly non-mandatory pools are ignored.
// Deficiency courses and coop work terms (CWT) MUST be completed — include them.
const IGNORED_POOL_KEYWORDS = ["exemption", "used-unused"];

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
export function isOfferedIn(course: Course, term: SemesterId): boolean {
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
export function arePrereqsSatisfied(
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
 * Fills semesters with incomplete degree-required courses, respecting:
 *   1. Pool credit caps — elective pools stop being filled once creditsRequired is met
 *   2. Existing empty semesters are filled before new ones are generated
 *   3. Prerequisites (must be completed or planned in an earlier semester)
 *   4. Course offering seasons (offeredIN field)
 *   5. Max credits per semester (19)
 *
 * Returns a plain OptimizerResult (no side effects — caller decides whether to apply).
 */
export function optimizePath(state: TimelineState): OptimizerResult {
  // 1. Identify pools to skip (exemptions and used/unused only)
  const ignoredPoolIds = new Set(
    state.pools
      .filter((p) =>
        IGNORED_POOL_KEYWORDS.some(
          (kw) =>
            p._id.toLowerCase().includes(kw) ||
            p.name.toLowerCase().includes(kw)
        )
      )
      .map((p) => p._id)
  );

  const degreePools = state.pools.filter((p) => !ignoredPoolIds.has(p._id));

  // 2. Build course → pool map and track credits already covered per pool
  const courseToPool = new Map<string, Pool>();
  const poolCreditsCovered = new Map<string, number>();

  for (const pool of degreePools) {
    let covered = 0;
    for (const code of pool.courses) {
      courseToPool.set(code, pool);
      const course = state.courses[code];
      if (
        course &&
        (course.status.status === "completed" ||
          course.status.status === "planned")
      ) {
        covered += course.credits ?? 3;
      }
    }
    poolCreditsCovered.set(pool._id, covered);
  }

  // 3. Find incomplete courses whose pool still needs more credits
  const toPlace = [...courseToPool.keys()].filter((code) => {
    const course = state.courses[code];
    if (!course || course.status.status !== "incomplete") return false;
    const pool = courseToPool.get(code)!;
    const covered = poolCreditsCovered.get(pool._id) ?? 0;
    return covered < pool.creditsRequired;
  });

  const existingLastTerm = state.semesters.at(-1)?.term as
    | SemesterId
    | undefined;

  if (toPlace.length === 0 || !existingLastTerm) {
    return {
      semesters: state.semesters,
      courses: state.courses,
      placedCount: 0,
      unplacedCount: toPlace.length,
      newSemesterCount: 0,
      estimatedGraduation: existingLastTerm ?? null,
    };
  }

  // 4. Working copies
  const workingSemesters: Semester[] = state.semesters.map((s) => ({ ...s }));
  let workingCourses: CourseMap = { ...state.courses };
  const remaining = new Set(toPlace);
  let placed = 0;

  // Attempts to fill a single semester slot with eligible courses
  function fillSlot(semIdx: number, term: SemesterId): void {
    let creditsUsed = workingSemesters[semIdx].courses.reduce(
      (sum, sc) => sum + (workingCourses[sc.code]?.credits ?? 3),
      0
    );

    for (const code of [...remaining]) {
      const course = workingCourses[code];
      if (!course) {
        remaining.delete(code);
        continue;
      }

      const credits = course.credits ?? 3;
      if (creditsUsed + credits > MAX_CREDITS_PER_SEMESTER) continue;
      if (!isOfferedIn(course, term)) continue;
      if (!arePrereqsSatisfied(course, semIdx, workingSemesters, workingCourses))
        continue;

      // Respect pool credit cap
      const pool = courseToPool.get(code)!;
      const covered = poolCreditsCovered.get(pool._id) ?? 0;
      if (covered >= pool.creditsRequired) {
        remaining.delete(code);
        continue;
      }

      // Place the course
      workingSemesters[semIdx] = {
        ...workingSemesters[semIdx],
        courses: [...workingSemesters[semIdx].courses, { code, message: "" }],
      };
      workingCourses = {
        ...workingCourses,
        [code]: { ...course, status: { status: "planned", semester: term } },
      };
      poolCreditsCovered.set(pool._id, covered + credits);
      creditsUsed += credits;
      remaining.delete(code);
      placed++;
    }
  }

  // 5. Fill existing empty semesters first
  const emptyExistingIndices = workingSemesters
    .map((_, i) => i)
    .filter((i) => workingSemesters[i].courses.length === 0);

  for (const semIdx of emptyExistingIndices) {
    if (remaining.size === 0) break;
    fillSlot(semIdx, workingSemesters[semIdx].term as SemesterId);
  }

  // 6. Add new semesters until all courses are placed or cap is reached
  let newSemesterCount = 0;
  let currentNewTerm = nextTerm(existingLastTerm);

  while (remaining.size > 0 && newSemesterCount < MAX_EXTRA_SEMESTERS) {
    newSemesterCount++;
    workingSemesters.push({ term: currentNewTerm, courses: [] });
    fillSlot(workingSemesters.length - 1, currentNewTerm);
    currentNewTerm = nextTerm(currentNewTerm);
  }

  // 7. Estimate graduation from last non-empty semester
  const lastNonEmpty = [...workingSemesters]
    .reverse()
    .find((s) => s.courses.length > 0);

  return {
    semesters: workingSemesters,
    courses: workingCourses,
    placedCount: placed,
    unplacedCount: remaining.size,
    newSemesterCount,
    estimatedGraduation: (lastNonEmpty?.term ?? existingLastTerm) as SemesterId,
  };
}
