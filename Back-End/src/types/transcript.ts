/**
 * Unified structure for parsed transcript and acceptance letter data
 */
export interface ParsedData {
  programInfo?: ProgramInfo;
  semesters?: Semester[]; // courses that were taken in this program
  transferedCourses?: string[]; // List of course codes
  exemptedCourses?: string[]; // List of course codes
  deficiencyCourses?: string[]; // List of course codes
}
export type CourseStatus = "completed" | "incomplete" | "inprogress" | "planned" | "exempted";

export interface Semester {
  term: string; // Season (e.g., "Fall 2022")
  courses: { code: string; grade?: string }[];
}

export interface ProgramInfo {
  degree: string;
  firstTerm?: string; // e.g., "Fall 2022"
  lastTerm?: string; // e.g., "Spring 2026"
  isCoop?: boolean;
  isExtendedCreditProgram?: boolean;
  minimumProgramLength?: number;
  predefinedSequence?: PredefinedSequenceTerm[];
}

export interface PredefinedSequenceTerm {
  type: "Academic" | "Co-op";
  courses?: string[];
  coopLabel?: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ParsePDFResponse extends ApiResponse<ParsedData> {
  data: ParsedData;
}
