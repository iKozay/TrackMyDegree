import type { Course, SemesterId } from "../types/timeline.types";

// Function that checks if a course already exists in a semester
export function canDropCourse(
  course: Course,
  fromSemesterId?: SemesterId
): { allowed: boolean; reason?: string } {
  // Safety guard
  if (!course) {
    return { allowed: true };
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
