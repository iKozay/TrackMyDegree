export interface ParsedData {
  programInfo?: ProgramInfo;
  coursesTaken?: CourseTaken[];
  transferedCourses?: string[]; // List of course codes
  exemptedCourses?: string[];
  deficiencyCourses?: string[];
}
export interface CourseTaken { //TODO: CHANGE THIS TO MAYBE TERM
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
}
