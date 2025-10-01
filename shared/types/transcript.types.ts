/**
 * Shared TypeScript types for Transcript parsing
 * Used by both frontend and backend to ensure type consistency
 */

/**
 * Represents a transfer credit from prior institutions
 */
export interface TransferCredit {
  courseCode: string;
  courseTitle: string;
  grade: string;
  yearAttended?: string;
  programCreditsEarned: number;
}

/**
 * Represents a single course from the transcript
 */
export interface TranscriptCourse {
  courseCode: string;
  section?: string;
  courseTitle: string;
  credits: number;
  grade: string;
  notation?: string;
  gpa?: number;
  classAvg?: number;
  classSize?: number;
  gradePoints?: number;
  term: string;
  year: string;
  other?: string;
}

/**
 * Represents a term/semester in the transcript
 */
export interface TranscriptTerm {
  term: string;
  year: string;
  courses: TranscriptCourse[];
  termGPA?: number;
  termCredits?: number;
}

/**
 * Represents student information from the transcript
 */
export interface StudentInfo {
  studentId?: string;
  studentName?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  birthdate?: string;
  permanentCode?: string;
  telephone?: string;
}

/**
 * Represents program information from the transcript
 */
export interface ProgramInfo {
  status: string;
  startDate: string;
  admitTerm?: string;
  degreeType: string;
  major: string;
  note?: string;
}

/**
 * Additional academic information
 */
export interface AdditionalInfo {
  overallGPA?: number;
  minCreditsRequired?: number;
  programCreditsEarned?: number;
  writingSkillsRequirement?: string;
}

/**
 * Statistics calculated from the transcript
 */
export interface TranscriptStatistics {
  totalCourses: number;
  completedCourses: number;
  totalCreditsEarned: number;
  transferCredits: number;
}

/**
 * Represents the complete parsed transcript data
 */
export interface ParsedTranscript {
  studentInfo: StudentInfo;
  programHistory: ProgramInfo[];
  transferCredits: TransferCredit[];
  terms: TranscriptTerm[];
  additionalInfo: AdditionalInfo;
  statistics?: TranscriptStatistics;
}

/**
 * Configuration options for the transcript parser
 */
export interface TranscriptParserOptions {
  validateCourseCode?: boolean;
  extractGPA?: boolean;
  extractTermInfo?: boolean;
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

export interface ParseTranscriptResponse extends ApiResponse<ParsedTranscript> {
  data: ParsedTranscript;
}

export interface ValidateTranscriptResponse extends ApiResponse {
  valid?: boolean;
  preview?: {
    studentName?: string;
    studentId?: string;
  };
}

