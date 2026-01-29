import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";

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
  semesterId?: SemesterId | null;
  message?: string;
}

export const DraggableCourse: React.FC<DraggableCourseProps> = ({
  courseId,
  course,
  onCourseSelect,
  isSelected,
  semesterId = null,
  message,
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
        role="presentation"
        {...listeners}
        onClick={() => {
          // if this interaction was actually a drag, ignore click
          if (isDragging) return;
          onCourseSelect(courseId);
        }}>
        <div className="course-btn">
          <div className="course-code">{course.id}</div>
          {message && message.trim() !== "" && (
            <span className="course-warning" title={message}>
              <AlertTriangle size={20} />
            </span>
          )}
        </div>

        <div className="course-name">{course.title}</div>
        <span className="course-credits">{course.credits} cr</span>
      </div>
    </div>
  );
};
