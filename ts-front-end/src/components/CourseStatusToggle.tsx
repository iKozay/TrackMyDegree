import React from "react";
import { CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
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
    <div className="course-status-actions">
      <div className="status-actions-label">Change course status</div>

      <div className="status-actions-buttons">
        {/* Mark as Incomplete */}
        <button
          className={`status-action-btn incomplete ${
            canMarkIncomplete ? "active" : ""
          }`}
          onClick={() => onChangeStatus("incomplete")}
          disabled={!canMarkIncomplete}>
          <AlertTriangle size={16} />
          Mark as Incomplete
        </button>

        {/* Mark as Completed */}
        <button
          className={`status-action-btn completed ${
            canMarkCompleted ? "active" : ""
          }`}
          onClick={() => onChangeStatus("completed")}
          disabled={!canMarkCompleted}>
          <CheckCircle size={16} />
          Mark as Completed
        </button>

        {/* Remove from Timeline */}
        <button
          className={`status-action-btn danger ${
            canRemoveFromTimeline ? "active" : ""
          }`}
          onClick={handleRemoveFromTimeline}
          disabled={!canRemoveFromTimeline}>
          <Trash2 size={16} />
          Remove from Timeline
        </button>
      </div>
    </div>
  );
};
