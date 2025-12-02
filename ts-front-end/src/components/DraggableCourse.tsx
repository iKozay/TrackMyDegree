import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Minus } from "lucide-react";
import type {
  Course,
  CourseCode,
  SemesterId,
  CourseStatusValue,
} from "../types/timeline.types"; // adjust path

import type { DragCourseData } from "../types/dnd.types";

interface DraggableCourseProps {
  courseId: CourseCode;
  course: Course;
  onCourseSelect: (courseId: CourseCode) => void;
  isSelected: boolean;
  onRemove?: (courseId: CourseCode) => void;
  semesterId?: SemesterId | null;
}

export const DraggableCourse: React.FC<DraggableCourseProps> = ({
  courseId,
  course,
  onCourseSelect,
  isSelected,
  onRemove,
  semesterId = null,
}) => {
  const isDraggable = course.status.status !== "completed";

  const dragId = semesterId
    ? `planner:${semesterId}:${courseId}`
    : `pool:${courseId}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: dragId,
      data: {
        type: "course",
        courseId,
        source: semesterId ? "planner" : "pool",
        semesterId: semesterId ?? undefined,
      } as DragCourseData,
      disabled: !isDraggable,
    });

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const getStatusColor = (status: CourseStatusValue): string => {
    switch (status) {
      case "completed":
        return "status-completed";
      case "planned":
        return "status-planned";
      case "in-progress":
        return "status-inprogress";
      case "incomplete":
      default:
        return "status-incomplete";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`course-card ${getStatusColor(course.status.status)} ${
        isSelected ? "selected" : ""
      } ${isDragging ? "dragging" : ""} ${!isDraggable ? "not-draggable" : ""}`}
      {...attributes}>
      {/* drag handle + click-to-select */}
      <div
        className="course-content"
        {...listeners}
        onClick={() => {
          // if this interaction was actually a drag, ignore click
          if (isDragging) return;
          onCourseSelect(courseId);
        }}>
        <div className="course-btn">
          <div className="course-code">{course.id}</div>
          {onRemove && (
            <button
              className="remove-course-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(courseId);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}>
              <Minus size={12} />
            </button>
          )}
        </div>

        <div className="course-name">{course.title}</div>
        <div className="course-credits">{course.credits} cr</div>
      </div>
    </div>
  );
};
