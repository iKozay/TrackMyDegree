export interface TimelineEntry {
    season: string;
    year: number;
    coursecode: string;
}

export interface DeficiencyEntry {
    coursepool: string;
    creditsRequired: number;
}

export interface ExemptionEntry {
    coursecode: string;
}

export interface Degree {
    id: string;
    name: string;
    totalCredits: number;
}

export interface UserDataResponse {
    timeline: TimelineEntry[];
    deficiencies: DeficiencyEntry[];
    exemptions: ExemptionEntry[];
    degree: Degree | null;
}
