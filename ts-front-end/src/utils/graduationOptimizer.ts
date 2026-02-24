import type {
  TimelineState,
  Course,
  Semester,
  SemesterId,
  CourseMap,
} from "../types/timeline.types";

const MAX_CREDITS_PER_SEMESTER = 19;
const MAX_EXTRA_SEMESTERS = 24;

// Pool keywords that are NOT degree requirements
const SPECIAL_POOL_KEYWORDS = ["exemption", "deficien", "used-unused", "coop"];

export interface OptimizerResult {
  semesters: Semester[];
  courses: CourseMap;
  placedCount: number;
  unplacedCount: number;
  newSemesterCount: number;
  estimatedGraduation: SemesterId | null;
}
