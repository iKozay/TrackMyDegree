/**
 * All possible action identifiers for the timeline.
 */
export const TimelineActionConstants = {
  Init: "INIT",
  SelectCourse: "SELECT-COURSE",
  MoveFromPoolToSemester: "MOVE-FROM-POOL-TO-SEMESTER",
  MoveBetweenSemesters: "MOVE-BETWEEN-SEMESTERS",
  RemoveFromSemester: "REMOVE-FROM-SEMESTER",
  Undo: "UNDO",
  Redo: "REDO",
} as const;
