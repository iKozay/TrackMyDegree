// UI model used by the schedule grid and sidebar components
export interface ClassItem {
    name: string;
    section: string;
    room: string;
    day: number; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    startTime: number; // hour in 24h format (8-22)
    endTime: number; // hour in 24h format (8-22)
}

// Raw API response shape from /section/schedule
export interface CourseSection {
    courseID: string;
    termCode: string;
    session: string;
    subject: string;
    catalog: string;
    section: string;
    componentCode: string;          // e.g. "LEC", "TUT", "LAB"
    componentDescription: string;   // e.g. "Lecture", "Tutorial", "Laboratory"
    classNumber: string;
    classAssociation: string;
    courseTitle: string;
    topicID: string;
    topicDescription: string;
    classStatus: string;            // e.g. "Active", "Cancelled Section"
    locationCode: string;
    instructionModeCode: string;    // e.g. "P" (in-person), "OL" (online)
    instructionModeDescription: string;
    meetingPatternNumber: string;
    roomCode: string;
    buildingCode: string;
    room: string;
    classStartTime: string;         // e.g. "13.15.00"
    classEndTime: string;           // e.g. "14.30.00"
    modays: string;                 // "Y" | "N" | ""
    tuesdays: string;               // "Y" | "N" | ""
    wednesdays: string;             // "Y" | "N" | ""
    thursdays: string;              // "Y" | "N" | ""
    fridays: string;                // "Y" | "N" | ""
    saturdays: string;              // "Y" | "N" | ""
    sundays: string;                // "Y" | "N" | ""
    classStartDate: string;         // "DD/MM/YYYY"
    classEndDate: string;           // "DD/MM/YYYY"
    career: string;
    departmentCode: string;
    departmentDescription: string;
    facultyCode: string;
    facultyDescription: string;
    enrollmentCapacity: string;
    currentEnrollment: string;
    waitlistCapacity: string;
    currentWaitlistTotal: string;
    hasSeatReserved: string;        // "Y" | ""
}

// One entry per course the student has added to their builder.
// Holds the full API response for that course so the configuration
// system can compute all valid LEC + TUT + LAB combinations.
export interface AddedCourse {
    // Course Code, e.g. "COMP 352"
    code: string;
    // Title, e.g. "DATA STRUCTURES + ALGORITHMS"
    title: string;
    // All active sections for this course in the selected term
    sections: CourseSection[];
}