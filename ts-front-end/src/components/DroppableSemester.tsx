import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Calendar, Clock } from "lucide-react";
import { DraggableCourse } from "./DraggableCourse";
import type {
  CourseMap,
  CourseCode,
  SemesterId,
} from "../types/timeline.types";
import type { DroppableSemesterData } from "../types/dnd.types";

interface DroppableSemesterProps {
  semesterId: SemesterId;
  courses: CourseMap;
  semesterCourses: CourseCode[];
  onCourseSelect: (courseId: CourseCode) => void;
  selectedCourse?: CourseCode | null;
  onRemoveCourse: (courseId: CourseCode, semesterId: SemesterId) => void;
}

export const DroppableSemester: React.FC<DroppableSemesterProps> = ({
  semesterId,
  courses,
  semesterCourses,
  onCourseSelect,
  selectedCourse,
  onRemoveCourse,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: semesterId,
    data: { type: "semester", semesterId } as DroppableSemesterData,
  });

  const [season, year] = semesterId.split(" ");
  const seasonLabel =
    season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();

  const totalCredits = semesterCourses.reduce((sum, courseId) => {
    const course = courses[courseId];
    return sum + (course?.credits ?? 0);
  }, 0);

  return (
    <div ref={setNodeRef} className={`semester ${isOver ? "drag-over" : ""}`}>
      <div className="semester-header">
        <div className="semester-title">
          <Calendar size={16} />
          <span>
            {seasonLabel} {year}
          </span>
        </div>
        <div className="semester-credits">
          <Clock size={14} />
          {totalCredits} credits
        </div>
      </div>

      <div className="semester-courses">
        {semesterCourses.length === 0 ? (
          <div className="empty-semester">Drop courses here</div>
        ) : (
          semesterCourses.map((courseId) => {
            const course = courses[courseId];
            if (!course) return null;

            return (
              <DraggableCourse
                key={courseId}
                courseId={courseId}
                course={course}
                onCourseSelect={onCourseSelect}
                isSelected={selectedCourse === courseId}
                onRemove={() => onRemoveCourse(courseId, semesterId)}
                semesterId={semesterId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
