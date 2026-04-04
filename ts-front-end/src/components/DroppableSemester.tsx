import React from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Calendar, Clock, GripVertical, Trash2 } from "lucide-react";
import { DraggableCourse } from "./DraggableCourse";
import type {
  CourseMap,
  CourseCode,
  SemesterId,
  SemesterCourse,
} from "../types/timeline.types";
import type { DragSemesterData, DroppableSemesterData } from "../types/dnd.types";

interface DroppableSemesterProps {
  semesterId: SemesterId;
  courses: CourseMap;
  semesterCourses: SemesterCourse[];
  onCourseSelect: (courseId: CourseCode) => void;
  selectedCourse?: CourseCode | null;
  onRemoveSemester?: (semesterId: SemesterId) => void;
}

export const DroppableSemester: React.FC<DroppableSemesterProps> = ({
  semesterId,
  courses,
  semesterCourses,
  onCourseSelect,
  selectedCourse,
  onRemoveSemester,
}) => {
  const isFallWinter = semesterId.startsWith("FALL/WINTER");

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: semesterId,
    data: { type: "semester", semesterId } as DroppableSemesterData,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `semester-card:${semesterId}`,
    data: { type: "semester-card", semesterId } as DragSemesterData,
    disabled: !isFallWinter,
  });

  // Merge the two refs
  const setRef = (node: HTMLDivElement | null) => {
    setDropRef(node);
    setDragRef(node);
  };

  const [season, yearPart] = semesterId.split(" ");

  // Capitalise each word separated by "/" (handles "FALL", "WINTER", "SUMMER", "FALL/WINTER")
  const seasonLabel = season
    .split("/")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join("/");

  const totalCredits = semesterCourses.reduce((sum, c) => {
    const course = courses[c.code];
    return sum + (course?.credits ?? 0);
  }, 0);

  return (
    <div
      ref={setRef}
      className={`semester ${isOver ? "drag-over" : ""} ${isDragging ? "semester--dragging" : ""}`}>
      <div className="semester-header">
        {/* Only FALL/WINTER semesters are draggable for reordering */}
        {isFallWinter && (
          <button
            type="button"
            className="semester-drag-handle"
            aria-label="Drag to reorder semester"
            {...attributes}
            {...listeners}>
            <GripVertical size={16} />
          </button>
        )}
        <div className="semester-title">
          <Calendar size={16} />
          <span>
            {seasonLabel} {yearPart}
          </span>
        </div>
        <div className="semester-credits">
          <Clock size={14} />
          {totalCredits} credits
        </div>
        {semesterCourses.length === 0 && onRemoveSemester && (
          <button
            type="button"
            className="semester-remove-btn"
            aria-label={`Remove empty semester`}
            title="Remove semester"
            onClick={() => onRemoveSemester(semesterId)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="semester-courses">
        {semesterCourses.length === 0 ? (
          <div className="empty-semester">Drop courses here</div>
        ) : (
          semesterCourses.map((c) => {
            const course = courses[c.code];
            if (!course) return null;

            return (
              <DraggableCourse
                key={c.code}
                courseId={c.code}
                message={c.message}
                course={course}
                onCourseSelect={onCourseSelect}
                isSelected={selectedCourse === c.code}
                semesterId={semesterId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
