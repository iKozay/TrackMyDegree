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

// Used for dragging the entire semester card (to reorder Fall/Winter semesters)
export interface DragSemesterData {
  type: "semester-card";
  semesterId: SemesterId;
}

// Used for dropping a semester card into a new position (to reorder Fall/Winter semesters)
export interface DroppableSemesterSlotData {
  type: "semester-slot";
  // Index of semester after drop
  targetIndex: number;
}

