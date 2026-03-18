
export interface DegreeData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
  degreeType?: string;
  ecpDegreeId: string;
}
export interface CoursePoolInfo {
  _id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
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