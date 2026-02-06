/**
 * All possible action identifiers for the timeline.
 */
// TODO : Add more actions Constants...
export const TimelineActionConstants = {
  Init: "INIT",
  SelectCourse: "SELECT-COURSE",
  MoveFromPoolToSemester: "MOVE-FROM-POOL-TO-SEMESTER",
  MoveBetweenSemesters: "MOVE-BETWEEN-SEMESTERS",
  RemoveFromSemester: "REMOVE-FROM-SEMESTER",
  Undo: "UNDO",
  Redo: "REDO",
  OpenModal: "OPEN-MODAL",
  ChangeCourseStatus: "CHANGE-COURSE-STATUS",
  AddCourse: "ADD-COURSE",
  AddSemester: "ADD-SEMESTER",
  SetTimelineName: "SET-TIMELINE-NAME",
} as const;
