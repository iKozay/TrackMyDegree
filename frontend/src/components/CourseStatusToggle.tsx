import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  LucideAlarmMinus,
  Trash2,
  TableOfContents,
} from "lucide-react";

import type {
  CourseCode,
  CourseStatusValue,
  SemesterId,
  Course,
} from "../types/timeline.types";

interface CourseStatusActionsProps {
  currentStatus: CourseStatusValue;
  course: Course;
  onRemoveCourse?: (courseId: CourseCode, semesterId: SemesterId) => void;
  onChangeCourseStatus?: (
    courseId: CourseCode,
    status: CourseStatusValue,
  ) => void;
}

export const CourseStatusActions: React.FC<CourseStatusActionsProps> = ({
  currentStatus,
  course,
  onChangeCourseStatus,
  onRemoveCourse,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const el = containerRef.current;
      if (!el || el.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const canMarkIncomplete = currentStatus === "completed";
  const canMarkCompleted = ["incomplete", "planned"].includes(currentStatus);
  const canRemoveFromTimeline = currentStatus === "planned";

  const semesterId = course.status.semester;

  const handleRemoveFromTimeline = () => {
    if (!semesterId || !onRemoveCourse) return;
    onRemoveCourse(course.id, semesterId);
    setIsOpen(false);
  };
  const onChangeStatus = (newStatus: CourseStatusValue) => {
    if (!onChangeCourseStatus) return;
    onChangeCourseStatus(course.id, newStatus);
    setIsOpen(false); // close menu after action
  };

  return (
    <div className="course-status-actions" ref={containerRef}>
      <button
        type="button"
        className={`status-menu-btn${isOpen ? " is-open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Course actions">
        <TableOfContents size={18} strokeWidth={2} aria-hidden />
      </button>

      {isOpen && (
        <div className="status-actions-dropdown" role="menu">
          <div className="status-actions-buttons">
            <button
              type="button"
              role="menuitem"
              className={`status-action-btn incomplete ${
                canMarkIncomplete ? "active" : ""
              }`}
              onClick={() => onChangeStatus("incomplete")}
              disabled={!canMarkIncomplete}>
              <LucideAlarmMinus
                className="status-icon incomplete"
                size={15}
                aria-hidden
              />
              <span>Mark as Incomplete</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={`status-action-btn completed ${
                canMarkCompleted ? "active" : ""
              }`}
              onClick={() => onChangeStatus("completed")}
              disabled={!canMarkCompleted}>
              <CheckCircle size={15} aria-hidden />
              <span>Mark as Completed</span>
            </button>

            <button
              type="button"
              role="menuitem"
              className={`status-action-btn danger ${
                canRemoveFromTimeline ? "active" : ""
              }`}
              onClick={handleRemoveFromTimeline}
              disabled={!canRemoveFromTimeline}>
              <Trash2 size={15} aria-hidden />
              <span>Remove from Timeline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
