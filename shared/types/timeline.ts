import {
  CoursePoolInfo,
  DegreeData,
} from './degree';
import {  CourseStatus } from '../../Back-End/src/types/transcript';

export interface TimelineResult {
  _id?: string; 
  timelineName?: string;
  degree?: DegreeData;
  pools?: CoursePoolInfo[];
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  courses: Record<string, TimelineCourse>;
}

export interface TimelineCourse {
  id: string;
  title: string;
  credits: number;
  description?: string;
  offeredIN: string[];
  prerequisites: { anyOf: string[] }[];
  corequisites: { anyOf: string[] }[];
  status: {
    status: CourseStatus;
    semester: string | null;
  };
}

export interface TimelineSemester {
  term: string;
  courses: {
    code: string;
    message?: string;
  }[];
}
// Timeline as stored in DB
export interface TimelineDocument {
  _id?: string;
  userId: string;
  name: string;
  degreeId: string;
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  last_modified?: Date;
  courseStatusMap: Record<
    string,
    {
      status: CourseStatus;
      semester: string | null;
    }
  >; // only the minimal course status info
  exemptions: string[];
  deficiencies: string[];
}
