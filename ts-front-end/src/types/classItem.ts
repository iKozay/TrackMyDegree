// UI model used by the weekly schedule
export interface ClassItem {
    classNumber: string; // unique section identifier from the API, used for pinning
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


export interface AddedCourse {
    code: string;
    title: string;
    sections: CourseSection[];
}