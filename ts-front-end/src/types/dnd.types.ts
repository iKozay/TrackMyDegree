import type { CourseCode, SemesterId } from "./timeline.types";

export type DragSource = "planner" | "pool";

export interface DragCourseData {
  type: "course";
  courseId: CourseCode;
  source: DragSource;
  semesterId?: SemesterId;
}

export interface DroppableSemesterData {
  type: "semester";
  semesterId: SemesterId;
}
