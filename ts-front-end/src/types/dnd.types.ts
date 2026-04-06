import type { CourseCode, SemesterId } from "./timeline.types";

export type DragSource = "planner" | "pool";

export interface DragCourseData {
  type: "course";
  courseId: CourseCode;
  source: DragSource;
  semesterId?: SemesterId;
}

// Represents a semester card in DnD operations (both as draggable and droppable)
export interface DndSemesterData {
  type: "semester";
  semesterId: SemesterId;
}

// Used for dropping a semester card into a new position (to reorder Fall/Winter semesters)
export interface DroppableSemesterSlotData {
  type: "semester-slot";
  // Index of semester after drop
  targetIndex: number;
}

