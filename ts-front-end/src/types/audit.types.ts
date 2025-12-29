export interface StudentInfo {
    name: string;
    studentId: string;
    program: string;
    advisor: string;
    gpa: string;
    admissionTerm: string;
    expectedGraduation: string;
}

export interface ProgressStats {
    completed: number;
    inProgress: number;
    remaining: number;
    total: number;
    percentage: number;
}

export interface Notice {
    id: string;
    type: 'warning' | 'info' | 'success';
    message: string;
}

export interface Course {
    id: string;
    code: string;
    title: string;
    credits: number;
    grade?: string;
    status: 'Completed' | 'In Progress' | 'Missing' | 'Not Started';
    term?: string;
}

export interface RequirementCategory {
    id: string;
    title: string;
    status: 'Complete' | 'In Progress' | 'Incomplete' | 'Not Started' | 'Missing';
    missingCount?: number;
    creditsCompleted: number;
    creditsTotal: number;
    courses: Course[];
}

export interface DegreeAuditData {
    student: StudentInfo;
    progress: ProgressStats;
    notices: Notice[];
    requirements: RequirementCategory[];
}