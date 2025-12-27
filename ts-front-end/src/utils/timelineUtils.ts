import type {
  SemesterList,
  CourseCode,
  SemesterId,
} from "../types/timeline.types";

// Function that checks if a course alredy exists in any semester
export function canDropCourse(
  semesters: SemesterList,
  courseId: CourseCode,
  fromSemesterId?: SemesterId
): { allowed: boolean; reason?: string } {
  const found = semesters.find((s) =>
    s.courses.some((c) => c.code === courseId)
  );

  // Case 1: course not found anywhere → OK
  if (!found) {
    return { allowed: true };
  }

  // Case 2: moving within the same semester → OK
  if (fromSemesterId && found.term === fromSemesterId) {
    return { allowed: true };
  }

  // Case 3: course exists in a DIFFERENT semester → BLOCK
  return {
    allowed: false,
    reason: `Course already in ${found.term}`,
  };
}
