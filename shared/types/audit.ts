export interface StudentInfo {
  name: string;
  studentId: string;
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

export interface AuditByTimelineRequest {
  timelineId: string;
  userId: string;
}

export interface AuditByUserRequest {
  userId: string;
}
