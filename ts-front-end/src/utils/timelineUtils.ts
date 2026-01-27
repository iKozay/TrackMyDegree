import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
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

export function calculateEarnedCredits(courses: CourseMap, exemptionCoursePool: Pool): number {
  return Object.values(courses).reduce((total, course) => {
    // Exclude exempted courses from the calculation
    if (exemptionCoursePool.courses.includes(course.id)) {
      return total;
    }
    
    if (course.status.status === "completed") {
      return total + (course.credits || 0);
    }
    return total;
  }, 0);
}

import { toast } from "react-toastify";
import { api } from "../api/http-api-client";

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
  id: "exemptions" | "deficiencies"
): CourseCode[] {
  return pools.find((p) => p._id.toLowerCase() === id)?.courses ?? [];
}

export function computeTimelinePartialUpdate(
  prev: TimelineState,
  curr: TimelineState
): TimelinePartialUpdate | null {
  const update: TimelinePartialUpdate = {};

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
