import { DraggableCourse } from "./DraggableCourse";
import type { Pool, CourseMap, CourseCode } from "../types/timeline.types";

interface PoolCoursesListProps {
  pool: Pool;
  courses: CourseMap;
  visibleCourseIds?: CourseCode[];
  selectedCourse?: CourseCode | null;
  showIncompleted?: boolean;
  onCourseSelect: (courseId: CourseCode) => void;
}

export const PoolCoursesList: React.FC<PoolCoursesListProps> = ({
  pool,
  courses,
  selectedCourse,
  visibleCourseIds,
  showIncompleted,
  onCourseSelect,
}) => {
  const idsToRender =
    visibleCourseIds && visibleCourseIds.length > 0
      ? visibleCourseIds
      : pool.courses;

  return (
    <div className="pool-courses">
      {idsToRender.map((courseId, index) => {
        const course = courses[courseId];
        if (!course) return null;
        const isCompleted = course.status.status === "completed";
        const isPlanned = course.status.status === "planned";
        if (showIncompleted && (isCompleted || isPlanned)) return null;

        return (
          <DraggableCourse
            key={`${pool.name}:${courseId}:${index}`}
            courseId={courseId}
            course={course}
            isSelected={selectedCourse === courseId}
            onCourseSelect={onCourseSelect}
          />
        );
      })}
    </div>
  );
};
