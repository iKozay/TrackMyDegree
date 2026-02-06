import React from "react";
import { DroppableSemester } from "./DroppableSemester";

import type {
  CourseMap,
  CourseCode,
  SemesterId,
  SemesterList,
} from "../types/timeline.types";
import { Plus } from "lucide-react";

interface SemesterPlannerProps {
  semesters: SemesterList;
  courses: CourseMap;
  onCourseSelect: (courseId: CourseCode) => void;
  selectedCourse?: CourseCode | null;
  onAddSemester: () => void;
  timelineName?: string;
}

const getDisplayName = (timelineName: string | undefined): string => {
    if (!timelineName) {
        return "Academic Plan";
    }
    return timelineName;
};

const SemesterPlanner: React.FC<SemesterPlannerProps> = ({
  semesters,
  courses,
  onCourseSelect,
  selectedCourse,
  onAddSemester,
  timelineName
}) => {
  return (
    <div className="timeline">
      <div className="planner-header">
        <h2>{getDisplayName(timelineName)}</h2>
        <button className="btn btn-tertiary" onClick={onAddSemester}>
          <Plus size={16} />
          Add Semester
        </button>
      </div>
      <div className="semesters-grid">
        {semesters.map(({ term, courses: semesterCourses }) => (
          <DroppableSemester
            key={term}
            semesterId={term as SemesterId}
            courses={courses}
            semesterCourses={semesterCourses}
            onCourseSelect={onCourseSelect}
            selectedCourse={selectedCourse}
          />
        ))}
      </div>
    </div>
  );
};

export default SemesterPlanner;
