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

export interface User {
  id: string;
  email: string;
  fullname: string;
  type: string;
  degree: string | null; // Foreign key reference (Degree ID)
}

export interface UserDataResponse {
  user: User;
  timeline: TimelineEntry[];
  deficiencies: DeficiencyEntry[];
  exemptions: ExemptionEntry[];
  degree: Degree | null; // Expanded degree details (if available)
}
