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
  onRemoveCourse: (courseId: CourseCode, semesterId: SemesterId) => void;
}

const SemesterPlanner: React.FC<SemesterPlannerProps> = ({
  semesters,
  courses,
  onCourseSelect,
  selectedCourse,
  onRemoveCourse,
}) => {
  return (
    <div className="timeline">
      <div className="planner-header">
        <h2>Academic Plan</h2>
        <button className="btn btn-tertiary">
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
            onRemoveCourse={onRemoveCourse}
          />
        ))}
      </div>
    </div>
  );
};

export default SemesterPlanner;
