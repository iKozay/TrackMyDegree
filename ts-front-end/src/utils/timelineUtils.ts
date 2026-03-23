import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import type {
  Course,
  CourseCode,
  CourseMap,
  SemesterId,
  SemesterList,
  TimelinePartialUpdate,
  TimelineState,
} from "../types/timeline.types";
import { type CoursePoolData, type Rule, type MinCoursesFromSetParams, type MaxCoursesFromSetParams, type MinCreditsFromSetParams, type MaxCreditsFromSetParams, RuleType, type MinCreditsCompletedParams } from "@trackmydegree/shared";
import { toast } from "react-toastify";
import { api } from "../api/http-api-client";

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

export function calculateEarnedCredits(courses: CourseMap, pool: CoursePoolData,
): number {
  return Object.values(courses).reduce((total, course) => {
    // Exclude exempted courses from the calculation
    if (pool.courses.includes(course.id)) {
      return total;
    }

    if (course.status.status === "completed" || course.status.status === "planned") {
      return total + (course.credits || 0);
    }
    return total;
  }, 0);
}

export function calculateCoursePoolEarnedCredits(courses: CourseMap, pool: CoursePoolData,
): number {
  return Object.values(courses).reduce((total, course) => {
    if (pool.courses.includes(course.id) && course.status.status === "completed") {
      return total + (course.credits || 0);;
    }
    return total;
  }, 0);
}

export async function saveTimeline(
  userId: string,
  timelineName: string,
  jobId?: string
) {
  const savePromise = api.post("/timeline", {
    userId,
    timelineName,
    ...(jobId && { jobId }),
  });

  return toast.promise(savePromise, {
    pending: "Saving timeline...",
    success: "Timeline saved successfully! 👌",
    error: "Failed to save timeline. Please try again. 🤯",
  });
}

function isCourseSatisfied(
  course: Course | undefined,
  courseSemesterIndex: number,
  semesters: SemesterList
): boolean {
  // This function checks if a course is satisfied (completed or planned in a previous semesters)
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
function isCourseSatisfiedSameSemester(
  course: Course | undefined,
  courseSemesterIndex: number,
  semesters: SemesterList
): boolean {
  // This function checks if a course is satisfied (completed or planned in same semester)
  if (!course) return false;

  if (course.status.status === "completed") return true;

  if (course.status.status !== "planned") return false;

  const index = semesters.findIndex((s) => s.term === course.status.semester);

  return index !== -1 && index === courseSemesterIndex;
}
function isCourseSatisfiedSameOrBefore(
  course: Course | undefined,
  courseSemesterIndex: number,
  semesters: SemesterList
): boolean {
  // This function checks if a course is satisfied (completed or planned in a previous semesters or the same semester)
  return isCourseSatisfied(course, courseSemesterIndex, semesters) || isCourseSatisfiedSameSemester(course, courseSemesterIndex, semesters);
}

export function getCourseValidationMessage(
  course: Course,
  state: TimelineState
): string {
  const { semesters } = state;

  const courseSemesterId = course.status.semester;
  if (!courseSemesterId) return "";

  const courseSemesterIndex = semesters.findIndex(
    (s) => s.term === courseSemesterId
  );
  if (courseSemesterIndex === -1) return "";

  const violations: string[] = [];

  /* ---------------- COURSE RULES ---------------- */
  processRules(course, course.rules, state, violations);

  /* -------------- COURSEPOOL RULES -------------- */
  const pool = state.pools.find((p) =>
    p.courses.includes(course.id)
  );

  if (pool?.rules && Array.isArray(pool.rules) && pool.rules.length > 0) {
    processRules(course, pool.rules, state, violations);
  }

  // pretty print the violations (if any)
  if (violations.length > 0) {
    return violations.join("\n");
  }

  return "";
}

export function processRules(targetCourse: Course, rules: Rule[], state: TimelineState, violations: string[]) {
  // Guard check: ensure rules is an array
  if (!Array.isArray(rules) || rules.length === 0) {
    return;
  }

  for (const rule of rules) {
    switch (rule.type) {
      case RuleType.Prerequisite:{
        processRequisiteRule(rule, isCourseSatisfied, state, violations);
        break;
      }
      case RuleType.Corequisite:{
        processRequisiteRule(rule, isCourseSatisfiedSameSemester, state, violations);
        break;
      }
      case RuleType.PrerequisiteOrCorequisite: {
        processRequisiteRule(rule, isCourseSatisfiedSameOrBefore, state, violations);
        break;
      }
      case RuleType.NotTaken: {
        processMaxCoursesFromSetRule(rule, null, state, violations);
        break;
      }
      case RuleType.MinimumCredits: {
        processMinCreditsRule(rule, targetCourse, state, violations);
        break;
      }
      case RuleType.MinCreditsFromSet: {
        processMinCreditsFromSetRule(rule, targetCourse, state, violations);
        break;
      }
      case RuleType.MaxCreditsFromSet: {
        processMaxCreditsFromSetRule(rule, targetCourse, state, violations);
        break;
      }
      case RuleType.MinCoursesFromSet: {
        processMinCoursesFromSetRule(rule, targetCourse, state, violations);
        break;
      }
      case RuleType.MaxCoursesFromSet: {
        processMaxCoursesFromSetRule(rule, targetCourse, state, violations);
        break;
      }
      default:
        break;
    }
  }
}

function processRequisiteRule(
  rule: Rule,
  validationFunction: (course: Course | undefined, courseSemesterIndex: number, semesters: SemesterList) => boolean,
  state: TimelineState,
  violations: string[]
) {
  const { courseList } = rule.params as MinCoursesFromSetParams;

  const satisfied = courseList.some((code) => {
    const course = state.courses[code];
    return validationFunction(course, Number.MAX_SAFE_INTEGER, state.semesters);
  });

  if (!satisfied) {
    violations.push(rule.message);
  }
}

function processMinCreditsRule(rule: Rule, targetCourse: Course | null, state: TimelineState, violations: string[]) {
  const { minCredits } = rule.params as MinCreditsCompletedParams;

  // Get all courses before the semester of the target course (or all courses if targetCourse is null)
  const coursesBeforeTarget: CourseMap = {};
  for (const code in state.courses) {
    const course = state.courses[code];
    if (!course.status.semester) continue;

    const semesterIndex = state.semesters.findIndex(
      (s) => s.term === course.status.semester
    );

    const targetSemesterIndex = targetCourse
      ? state.semesters.findIndex((s) => s.term === targetCourse.status.semester)
      : Number.MAX_SAFE_INTEGER;

    if (semesterIndex !== -1 && semesterIndex < targetSemesterIndex) {
      coursesBeforeTarget[code] = course;
    }
  }
  
  const earnedCredits = calculateEarnedCredits(coursesBeforeTarget, {
    _id: "",
    name: "",
    courses: [],
    creditsRequired: 0,
    rules: [],
  });

  if (earnedCredits < minCredits) {
    violations.push(rule.message);
  }
}

function processMinCreditsFromSetRule(rule: Rule, targetCourse: Course | null, state: TimelineState, violations: string[]) {
  const { courseList, minCredits } = rule.params as MinCreditsFromSetParams;
  if (targetCourse && !courseList.includes(targetCourse.id)) return;

  const earnedCredits = calculateCoursePoolEarnedCredits(state.courses, {
    _id: "",
    name: "",
    courses: courseList,
    creditsRequired: 0,
    rules: [],
  });

  if (earnedCredits < minCredits) {
    violations.push(rule.message);
  }
}

function processMaxCreditsFromSetRule(rule: Rule, targetCourse: Course | null, state: TimelineState, violations: string[]) {
  const { courseList, maxCredits } = rule.params as MaxCreditsFromSetParams;
  if (targetCourse && !courseList.includes(targetCourse.id)) return;

  const earnedCredits = calculateCoursePoolEarnedCredits(state.courses, {
    _id: "",
    name: "",
    courses: courseList,
    creditsRequired: 0,
    rules: [],
  });

  if (earnedCredits > maxCredits) {
    violations.push(rule.message);
  }
}

function processMinCoursesFromSetRule(rule: Rule, targetCourse: Course | null, state: TimelineState, violations: string[]) {
  const { courseList, minCourses } = rule.params as MinCoursesFromSetParams;
  if (targetCourse && !courseList.includes(targetCourse.id)) return;

  const earnedCourses = courseList.filter((code) => 
    isCourseSatisfied(state.courses[code], Number.MAX_SAFE_INTEGER, state.semesters)
  ).length;

  if (earnedCourses < minCourses) {
    violations.push(rule.message);
  }
}

function processMaxCoursesFromSetRule(rule: Rule, targetCourse: Course | null, state: TimelineState, violations: string[]) {
  const { courseList, maxCourses } = rule.params as MaxCoursesFromSetParams;
  if (targetCourse && !courseList.includes(targetCourse.id)) return;

  const earnedCourses = courseList.filter((code) => 
    isCourseSatisfied(state.courses[code], Number.MAX_SAFE_INTEGER, state.semesters)
  ).length;

  if (earnedCourses > maxCourses) {
    violations.push(rule.message);
  }
}

function getPoolCourses(
  pools: CoursePoolData[],
  id: "exemptions" | "deficiencies"
): CourseCode[] {
  return pools.find((p) => p._id.toLowerCase() === id)?.courses ?? [];
}

export function computeTimelinePartialUpdate(
  prev: TimelineState,
  curr: TimelineState
): TimelinePartialUpdate | null {
  const update: TimelinePartialUpdate = {};

  if (prev.timelineName !== curr.timelineName) {
      update.timelineName = curr.timelineName;
  }

  /* ---------- EXEMPTIONS ---------- */
  const prevEx = [...getPoolCourses(prev.pools, "exemptions")].sort();
  const currEx = [...getPoolCourses(curr.pools, "exemptions")].sort();

  if (JSON.stringify(prevEx) !== JSON.stringify(currEx)) {
    update.exemptions = currEx;
  }

  /* ---------- DEFICIENCIES ---------- */
  const prevDef = [...getPoolCourses(prev.pools, "deficiencies")].sort();
  const currDef = [...getPoolCourses(curr.pools, "deficiencies")].sort();

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

export async function downloadTimelinePdf(): Promise<void> {
  // TODO: refactor this to use downloadUtils.ts
  const semestersGrid = document.querySelector(
    ".semesters-grid"
  ) as HTMLElement | null;
  if (!semestersGrid) {
    console.error("Semesters grid not found");
    return;
  }

  // 1. Clone the node
  const clone = semestersGrid.cloneNode(true) as HTMLElement;

  // 2. Create offscreen container
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "-100000px";
  wrapper.style.width = `${semestersGrid.scrollWidth}px`;
  wrapper.style.height = `${semestersGrid.scrollHeight}px`;
  wrapper.style.overflow = "visible";
  wrapper.style.background = "white";

  // 3. Force full width on clone
  clone.style.width = "auto";
  clone.style.maxWidth = "none";
  clone.style.overflow = "visible";

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // 4. Render full content
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: clone.scrollWidth,
      height: clone.scrollHeight,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    wrapper.remove();

    // 5. Create single-page PDF
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);

    pdf.save("timeline.pdf");
  } catch (err) {
    wrapper.remove();
    console.error("Failed to generate PDF:", err);
  }
}
