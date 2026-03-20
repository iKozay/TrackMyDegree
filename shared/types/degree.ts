
export interface DegreeData {
  _id: string;
  name: string;
  totalCredits: number;
  coursePools?: string[];
  degreeType?: string;
}

export interface CoursePoolInfo {
  _id: string;
  name: string;
  creditsRequired: number;
  courses: string[];
}

export interface CreateDegreeInput {
  name: string;
  totalCredits: number;
  degreeType?: string;
}

export type UpdateDegreeInput = Partial<CreateDegreeInput>;

export interface CreateCoursePoolInput {
  name: string;
  creditsRequired: number;
  degreeId: string;
  courses: string[];
}

export type UpdateCoursePoolInput = Partial<Omit<CreateCoursePoolInput, 'degreeId'>>;
