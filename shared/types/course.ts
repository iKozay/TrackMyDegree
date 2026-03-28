export interface RequisiteGroup {
  anyOf: string[];
}

export interface CourseDocument {
  _id: string;
  code?: string;
  title: string;
  credits: number;
  description?: string;
  offeredIn: string[];
  prerequisites?: RequisiteGroup[];
  corequisites?: RequisiteGroup[];
}

export interface CreateCourseInput {
  code: string;
  title: string;
  credits: number;
  description?: string;
  offeredIn: string[];
  prerequisites: RequisiteGroup[];
  corequisites: RequisiteGroup[];
}

export type UpdateCourseInput = Partial<CreateCourseInput>;
