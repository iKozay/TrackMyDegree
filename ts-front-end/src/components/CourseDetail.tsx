import React from "react";
import "../styles/components/CourseDetail.css";
import {
  Book,
  Clock,
  Calendar,
  LucideAlarmMinus,
  CheckCircle,
} from "lucide-react";
import CourseRules from "./CourseRules";
import type {
  Course,
  CourseCode,
  CourseMap,
  CourseStatusValue,
  SemesterId,
  SemesterList
} from "../types/timeline.types"; // adjust path
import { CourseStatusActions } from "./CourseStatusToggle";
import { CourseScheduleModal } from "../legacy/components/CourseScheduleModal";
interface CourseDetailsProps {
  course?: Course | null;
  semesters: SemesterList;
  courses: CourseMap;
  onRemoveCourse?: (courseId: CourseCode, semesterId: SemesterId) => void;
  onChangeCourseStatus?: (
    courseId: CourseCode,
    status: CourseStatusValue,
  ) => void;
}

const CourseDetail: React.FC<CourseDetailsProps> = ({
  course,
  courses,
  semesters,
  onRemoveCourse,
  onChangeCourseStatus,
}) => {
  if (!course) {
    return (
      <div className="course-details empty">
        <div className="empty-state">
          <Book size={48} />
          <h3>Select a Course</h3>
          <p>Click on any course to view its details</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: CourseStatusValue) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="status-icon completed" size={16} />;
      case "planned":
        return <Calendar className="status-icon planned" size={16} />;
      case "incomplete":
        return (
          <LucideAlarmMinus className="status-icon incomplete" size={16} />
        );
      default:
        return (
          <LucideAlarmMinus className="status-icon incomplete" size={16} />
        );
    }
  };

  const getStatusText = (status: CourseStatusValue): string => {
    switch (status) {
      case "completed":
        return "Completed";
      case "planned":
        return "Planned";
      case "incomplete":
        return "Incomplete";
      default:
        return "Incomplete";
    }
  };

  return (
    <div className="course-details">
      <div className="course-header">
        {/* using id here because your Course type/data has `id`, not `code` */}

        <div className="course-status">
          {getStatusIcon(course.status.status)}
          <span>{getStatusText(course.status.status)}</span>
        </div>
        <CourseStatusActions
          currentStatus={course.status.status}
          onRemoveCourse={onRemoveCourse}
          onChangeCourseStatus={onChangeCourseStatus}
          course={course}
        />
      </div>

      <div className="course-info">
        <h3>
          {course.id} : {course.title}
        </h3>
        <div className="info-item">
          <Clock size={16} />
          <span>{course.credits} Credits</span>
        </div>

        <div className="info-item">
          <Calendar size={16} />
          <span>
            Offered in:{" "}
            {course.offeredIn.length > 0 ? course.offeredIn.join(", ") : "N/A"}
          </span>
        </div>

        {course.status.semester && (
          <div className="info-item">
            <Calendar size={16} />
            <span>Scheduled: {course.status.semester}</span>
          </div>
        )}
        <div className="info-item">
          <CourseScheduleModal code={course.id} />
        </div>
      </div>

      <CourseRules
        course={course}
        courses={courses}
        semesters={semesters}
      />

    </div>
  );
};

export default CourseDetail;
