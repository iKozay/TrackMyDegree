import type { Course, CourseMap, SemesterId } from "../types/timeline.types";

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

export function calculateEarnedCredits(courses: CourseMap): number {
  return Object.values(courses).reduce((total, course) => {
    if (course.status.status === "completed") {
      return total + (course.credits || 0);
    }
    return total;
  }, 0);
}
