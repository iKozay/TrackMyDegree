export type JobStatus = "done" | "processing" | "error";

export type JobID = string; // e.g. "7272727727219nui"

export type PoolName = string; // e.g. "Engineering Core"

export interface Degree {
  name: string; // "BEng in Software Engineering"
  totalCredits: number; // 120
  coursePools: PoolName[]; // list of pool names this degree uses
}

export type CourseCode = string;

export interface Pool {
  name: string;
  creditsRequired: number;
  courses: CourseCode[];
}

export type Term = "FALL" | "WINTER" | "SUMMER"; // TODO: add FALL/WINTER
export type SemesterId = `${Term} ${number}`; // e.g. "FALL 2025"

export type SemesterCourse = {
  code: CourseCode;
  message: string;
};

export type Semester = {
  term: SemesterId;
  courses: SemesterCourse[];
};

export type SemesterList = Semester[];

// One “group” of requisites like { anyOf: ["COMP 248", "COMP 249"] }
export interface RequisiteGroup {
  anyOf: string[]; // can be course codes or special strings like "Cegep Mathematics 103"
}

// Course status
export type CourseStatusValue =
  | "incomplete"
  | "completed"
  | "in-progress"
  | "planned";

export interface CourseStatus {
  status: CourseStatusValue;
  semester: SemesterId | null;
}

// Main Course type
export interface Course {
  id: CourseCode;
  title: string;
  credits: number | null;
  description: string;

  // keeping the backend field name as-is; in UI you might rename to `offeredIn`
  offeredIN: SemesterId[];

  prerequisites: RequisiteGroup[] | string;
  corequisites: RequisiteGroup[] | string;

  status: CourseStatus;
}

// Map exactly like your JSON: { "SOEN 228": { ... }, ... }
export type CourseMap = Record<CourseCode, Course>;

export interface TimelineResult {
  degree: Degree;
  pools: Pool[];
  semesters: SemesterList;
  courses: CourseMap;
}

export interface TimelineJobResponse {
  jobId: JobID;
  status: JobStatus;
  result: TimelineResult | null;
}

type Snapshot = {
  courses: CourseMap;
  semesters: SemesterList;
};

type modalState = {
  open: boolean;
  type: string;
};

export interface TimelineState {
  pools: Pool[];
  courses: CourseMap;
  semesters: SemesterList;
  selectedCourse: CourseCode | null;
  history: Snapshot[];
  future: Snapshot[];
  modal: modalState;
}

import { TimelineActionConstants } from "./actions";

/**
 * Typed union of all actions the reducer understands.
 */
export type TimelineActionType =
  | {
      type: typeof TimelineActionConstants.Init;
      payload: { pools: Pool[]; courses: CourseMap; semesters: SemesterList };
    }
  | {
      type: typeof TimelineActionConstants.SelectCourse;
      payload: { courseId: CourseCode | null };
    }
  | {
      type: typeof TimelineActionConstants.MoveFromPoolToSemester;
      payload: { courseId: CourseCode; toSemesterId: SemesterId };
    }
  | {
      type: typeof TimelineActionConstants.MoveBetweenSemesters;
      payload: {
        courseId: CourseCode;
        fromSemesterId: SemesterId;
        toSemesterId: SemesterId;
      };
    }
  | {
      type: typeof TimelineActionConstants.RemoveFromSemester;
      payload: { courseId: CourseCode; semesterId: SemesterId };
    }
  | { type: typeof TimelineActionConstants.Undo }
  | { type: typeof TimelineActionConstants.Redo }
  | {
      type: typeof TimelineActionConstants.OpenModal;
      payload: { open: boolean; type: string };
    }
  | {
      type: typeof TimelineActionConstants.ChangeCourseStatus;
      payload: { courseId: CourseCode; status: CourseStatusValue };
    };
