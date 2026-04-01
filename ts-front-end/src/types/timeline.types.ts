import type { CoursePoolData, Rule } from "@trackmydegree/shared";
import { TimelineActionConstants } from "./actions";

export type JobStatus = "done" | "processing" | "error";

export type JobID = string; // e.g. "7272727727219nui"

export type PoolName = string; // e.g. "Engineering Core"

export interface Degree {
  name: string; // "BEng in Software Engineering"
  totalCredits: number; // 120
  coursePools: PoolName[]; // list of pool names this degree uses
}

export type CourseCode = string;

export type Term = "FALL" | "WINTER" | "SUMMER" | "FALL/WINTER";
// Used to know order of semesters for drag-and-drop reordering of Fall/Winter semesters to display the correct academic year
export type SemesterId =
  | `${"FALL" | "WINTER" | "SUMMER"} ${number}`   // e.g. "FALL 2025"
  | `FALL/WINTER ${number}-${number}`;             // e.g. "FALL/WINTER 2025-26"

export type SemesterCourse = {
  code: CourseCode;
  message: string;
};

export type Semester = {
  term: SemesterId;
  courses: SemesterCourse[];
};

export type SemesterList = Semester[];

// Course status
export type CourseStatusValue = "incomplete" | "completed" | "planned";

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

  offeredIn: SemesterId[];

  rules: Rule[];

  status: CourseStatus;
}

// Map exactly like your JSON: { "SOEN 228": { ... }, ... }
export type CourseMap = Record<CourseCode, Course>;

export interface TimelineResult {
  timelineName?: string;
  degree: Degree;
  pools: CoursePoolData[];
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
  timelineName: string;
  degree: Degree;
  pools: CoursePoolData[];
  courses: CourseMap;
  semesters: SemesterList;
  selectedCourse: CourseCode | null;
  history: Snapshot[];
  future: Snapshot[];
  modal: modalState;
}

export type TimelinePartialUpdate = {
  exemptions?: CourseCode[];
  deficiencies?: CourseCode[];
  courses?: CourseMap;
  semesters?: SemesterList;
  timelineName?: string;
};

/**
 * Typed union of all actions the reducer understands.
 */
export type TimelineActionType =
  | {
      type: typeof TimelineActionConstants.Init;
      payload: {
        timelineName: string;
        degree: Degree;
        pools: CoursePoolData[];
        courses: CourseMap;
        semesters: SemesterList;
      };
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
    }
  | {
      type: typeof TimelineActionConstants.AddCourse;
      payload: { courseId: CourseCode; type: string };
    }
  | {
      type: typeof TimelineActionConstants.RemoveCourse;
      payload: { courseId: CourseCode; type: string };
    }
  | { type: typeof TimelineActionConstants.AddSemester }
  | { type: typeof TimelineActionConstants.AddFallWinterSemester }
  | { type: typeof TimelineActionConstants.SetTimelineName; payload: { timelineName: string } }
  | {
      type: typeof TimelineActionConstants.MoveSemester;
      payload: { fromIndex: number; toIndex: number };
    };
