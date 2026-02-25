
export interface DegreeData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
}
export interface CoursePoolInfo {
  _id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
}
