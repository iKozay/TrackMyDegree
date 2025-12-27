// Simple ID generator for mocks
const uuidv4 = () => Math.random().toString(36).substr(2, 9);


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

export const generateMockDegreeAudit = (): DegreeAuditData => {
    return {
        student: {
            name: "John Smith",
            studentId: "40123456",
            program: "Bachelor of Computer Science",
            advisor: "Dr. Sarah Johnson",
            gpa: "3.45 / 4.0",
            admissionTerm: "Fall 2022",
            expectedGraduation: "Spring 2026"
        },
        progress: {
            completed: 75,
            inProgress: 12,
            remaining: 33,
            total: 120,
            percentage: 63
        },
        notices: [
            {
                id: uuidv4(),
                type: 'warning',
                message: "6 credits remaining in General Education requirements"
            },
            {
                id: uuidv4(),
                type: 'warning',
                message: "Capstone project (COMP 490) must be taken in final year"
            },
            {
                id: uuidv4(),
                type: 'info',
                message: "On track for graduation Spring 2026"
            }
        ],
        requirements: [
            {
                id: "req-core-cs",
                title: "Core Computer Science",
                status: "In Progress",
                missingCount: 2,
                creditsCompleted: 15,
                creditsTotal: 24,
                courses: [
                    { id: uuidv4(), code: "COMP 248", title: "Object-Oriented Programming I", credits: 3, grade: "A", status: "Completed" },
                    { id: uuidv4(), code: "COMP 249", title: "Object-Oriented Programming II", credits: 3, grade: "A-", status: "Completed" },
                    { id: uuidv4(), code: "COMP 352", title: "Data Structures & Algorithms", credits: 3, grade: "B+", status: "Completed" },
                    { id: uuidv4(), code: "COMP 346", title: "Operating Systems", credits: 3, grade: "B", status: "Completed" },
                    { id: uuidv4(), code: "COMP 348", title: "Principles of Programming Languages", credits: 3, grade: "A", status: "Completed" },
                    { id: uuidv4(), code: "COMP 371", title: "Computer Graphics", credits: 3, status: "In Progress" },
                    { id: uuidv4(), code: "COMP 445", title: "Data Communications", credits: 3, status: "Missing" },
                    { id: uuidv4(), code: "COMP 472", title: "Artificial Intelligence", credits: 3, status: "Missing" }
                ]
            },
            {
                id: "req-math",
                title: "Mathematics",
                status: "In Progress",
                creditsCompleted: 9,
                creditsTotal: 12,
                courses: [
                    { id: uuidv4(), code: "MATH 203", title: "Differential & Integral Calculus I", credits: 3, grade: "A", status: "Completed" },
                    { id: uuidv4(), code: "MATH 204", title: "Vectors & Matrices", credits: 3, grade: "B+", status: "Completed" },
                    { id: uuidv4(), code: "MATH 205", title: "Differential & Integral Calculus II", credits: 3, grade: "A-", status: "Completed" },
                    { id: uuidv4(), code: "MAST 218", title: "Multivariable Calculus I", credits: 3, status: "In Progress" }
                ]
            },
            {
                id: "req-tech-elec",
                title: "Technical Electives",
                status: "In Progress",
                missingCount: 3,
                creditsCompleted: 12,
                creditsTotal: 27,
                courses: [
                    { id: uuidv4(), code: "COMP 335", title: "Introduction to Theoretical CS", credits: 3, grade: "B", status: "Completed" },
                    // More mock data would go here
                ]
            },
            {
                id: "req-gen-ed",
                title: "General Education",
                status: "Incomplete",
                missingCount: 2,
                creditsCompleted: 12,
                creditsTotal: 18,
                courses: []
            },
            {
                id: "req-free-elec",
                title: "Free Electives",
                status: "Complete",
                creditsCompleted: 12,
                creditsTotal: 12,
                courses: []
            },
            {
                id: "req-capstone",
                title: "Capstone Project",
                status: "Not Started",
                missingCount: 1,
                creditsCompleted: 0,
                creditsTotal: 6,
                courses: []
            }
        ]
    };
};
