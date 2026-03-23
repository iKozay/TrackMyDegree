import { DraggableCourse } from "./DraggableCourse";
import type { CourseMap, CourseCode } from "../types/timeline.types";
import { type CoursePoolData } from "@trackmydegree/shared";

interface PoolCoursesListProps {
  pool: CoursePoolData;
  courses: CourseMap;
  visibleCourseIds?: CourseCode[];
  selectedCourse?: CourseCode | null;

  onCourseSelect: (courseId: CourseCode) => void;
}

export const PoolCoursesList: React.FC<PoolCoursesListProps> = ({
  pool,
  courses,
  selectedCourse,
  visibleCourseIds,
  onCourseSelect,
}) => {
  const idsToRender = visibleCourseIds ?? pool.courses;

  return (
    <div className="pool-courses">
      {idsToRender.map((courseId, index) => {
        const course = courses[courseId];
        if (!course) return null;

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
