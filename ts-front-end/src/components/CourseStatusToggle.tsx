import React from "react";
import { CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import "../styles/CourseStatus.css"; 

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
    status: CourseStatusValue
  ) => void;
}

export const CourseStatusActions: React.FC<CourseStatusActionsProps> = ({
  currentStatus,
  course,
  onChangeCourseStatus,
  onRemoveCourse,
}) => {
  const canMarkIncomplete = currentStatus === "completed";
  const canMarkCompleted = ["incomplete", "planned"].includes(currentStatus);
  const canRemoveFromTimeline = currentStatus === "planned";

  const semesterId = course.status.semester;

  const handleRemoveFromTimeline = () => {
    if (!semesterId || !onRemoveCourse) return;
    onRemoveCourse(course.id, semesterId);
  };

  const onChangeStatus = (newStatus: CourseStatusValue) => {
    if (!onChangeCourseStatus) return;
    onChangeCourseStatus(course.id, newStatus);
  };

  return (
    <div className="course-status-container">
      <div className="status-actions-label">Change course status</div>

      <div className="status-actions-buttons">
        {/* Only render buttons if they are valid actions */}
        {canMarkIncomplete && (
          <button
            className="status-action-btn btn-incomplete"
            onClick={() => onChangeStatus("incomplete")}
          >
            <AlertTriangle size={18} />
            Mark as Incomplete
          </button>
        )}

        {canMarkCompleted && (
          <button
            className="status-action-btn btn-completed"
            onClick={() => onChangeStatus("completed")}
          >
            <CheckCircle size={18} />
            Mark as Completed
          </button>
        )}

        {canRemoveFromTimeline && (
          <button
            className="status-action-btn btn-danger"
            onClick={handleRemoveFromTimeline}
          >
            <Trash2 size={18} />
            Remove from Timeline
          </button>
        )}
      </div>
    </div>
  );
};