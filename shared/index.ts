// audit.ts
export interface StudentInfo {
  name?: string;
  program: string;
  advisor?: string;
  gpa?: string;
  admissionTerm?: string;
  expectedGraduation?: string;
}

export interface ProgressStats {
  completed: number;
  inProgress: number;
  remaining: number;
  total: number;
  percentage: number;
}

export type NoticeType = 'warning' | 'info' | 'success';

export interface Notice {
  id: string;
  type: NoticeType;
  message: string;
}

export type CourseAuditStatus = 'Completed' | 'In Progress' | 'Missing' | 'Not Started';

export interface AuditCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  grade?: string;
  status: CourseAuditStatus;
  term?: string;
}

export type RequirementStatus = 'Complete' | 'In Progress' | 'Incomplete' | 'Not Started' | 'Missing';

export interface RequirementCategory {
  id: string;
  title: string;
  status: RequirementStatus;
  missingCount?: number;
  creditsCompleted: number;
  creditsTotal: number;
  courses: AuditCourse[];
}

export interface DegreeAuditData {
  student: StudentInfo;
  progress: ProgressStats;
  notices: Notice[];
  requirements: RequirementCategory[];
}

export interface GenerateAuditParams {
  timelineId: string;
  userId: string;
}

// creditForm.ts
export interface ICreditFormData {
    programId: string;
    title: string;
    subtitle: string;
    pdf: string;
    uploadedAt?: string;
}

export interface CreateCreditFormInput {
    programId: string;
    title: string;
    subtitle: string;
    filename: string;
    uploadedBy: string | null;
}

export interface UpdateCreditFormInput {
    title?: string;
    subtitle?: string;
    filename?: string;
    uploadedBy: string | null;
}

// degree.ts
export interface DegreeData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
  degreeType?: string;
  ecpDegreeId: string;
}
export interface CoursePoolData {
  _id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
  rules: Rule[];
}

export interface CourseData {
  _id: string;
  title: string;
  description?: string;
  credits: number;
  offeredIn?: string[];
  prereqCoreqText?: string;
  rules?: {
    prereq?: string[][];
    coreq?: string[][];
    not_taken?: string[];
    min_credits?: number;
  };
  notes?: string;
  components?: string[];
}

export interface Rule {
  type: string;
  level: 'warning' | 'info';
  message: string;
  params: MinCoursesFromSetParams | MaxCoursesFromSetParams | MinCreditsFromSetParams | MaxCreditsFromSetParams;
}

export interface MinCoursesFromSetParams {
  courseList: string[];
  minCourses: number;
}

export interface MaxCoursesFromSetParams {
  courseList: string[];
  maxCourses: number;
}

export interface MinCreditsFromSetParams {
  courseList: string[];
  minCredits: number;
}

export interface MaxCreditsFromSetParams {
  courseList: string[];
  maxCredits: number;
}

// timeline.ts
export type CourseStatus = "completed" | "incomplete" | "inprogress" | "planned";

export interface TimelineResult {
  _id?: string; 
  timelineName?: string;
  degree?: DegreeData;
  pools?: CoursePoolData[];
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  courses: Record<string, TimelineCourse>;
}

export interface TimelineCourse {
  id: string;
  title: string;
  credits: number;
  description?: string;
  offeredIn: string[];
  prerequisites: { anyOf: string[] }[];
  corequisites: { anyOf: string[] }[];
  status: {
    status: CourseStatus;
    semester: string | null;
  };
}

export interface TimelineSemester {
  term: string;
  courses: {
    code: string;
    message?: string;
  }[];
}
// Timeline as stored in DB
export interface TimelineDocument {
  _id?: string;
  userId: string;
  name: string;
  degreeId: string;
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  last_modified?: Date;
  courseStatusMap: Record<
    string,
    {
      status: CourseStatus;
      semester: string | null;
    }
  >; // only the minimal course status info
  exemptions: string[];
  deficiencies: string[];
}
