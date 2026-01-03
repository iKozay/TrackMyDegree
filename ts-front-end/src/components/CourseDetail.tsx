import React from "react";
import "../styles/components/CourseDetail.css";
import {
  Book,
  Clock,
  Calendar,
  LucideAlarmMinus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { RequisiteGroup } from "./RequisiteGroup";
import type {
  Course,
  CourseCode,
  CourseMap,
  CourseStatusValue,
  SemesterId,
} from "../types/timeline.types"; // adjust path
import { CourseStatusActions } from "./CourseStatusToggle";
import { CourseScheduleModal } from "../legacy/components/CourseScheduleModal";
interface CourseDetailsProps {
  course?: Course | null;
  courses?: CourseMap;
  onRemoveCourse?: (courseId: CourseCode, semesterId: SemesterId) => void;
  onChangeCourseStatus?: (
    courseId: CourseCode,
    status: CourseStatusValue
  ) => void;
}

const CourseDetail: React.FC<CourseDetailsProps> = ({
  course,
  courses = {},
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
      case "inprogress":
        return <AlertCircle className="status-icon inprogress" size={16} />;
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
      case "inprogress":
        return "In progress";
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
        <h2>{course.id}</h2>
        <div className="course-status">
          {getStatusIcon(course.status.status)}
          <span>{getStatusText(course.status.status)}</span>
        </div>
      </div>

      <div className="course-info">
        <h3>{course.title}</h3>

        <div className="info-item">
          <Clock size={16} />
          <span>{course.credits} Credits</span>
        </div>

        <div className="info-item">
          <Calendar size={16} />
          <span>
            Offered in:{" "}
            {course.offeredIN.length > 0 ? course.offeredIN.join(", ") : "N/A"}
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

      <RequisiteGroup
        title="Prerequisites"
        groups={course.prerequisites}
        courses={courses}
      />

      <RequisiteGroup
        title="Corequisites"
        groups={course.corequisites}
        courses={courses}
      />
      <CourseStatusActions
        currentStatus={course.status.status}
        onRemoveCourse={onRemoveCourse}
        onChangeCourseStatus={onChangeCourseStatus}
        course={course}
      />
    </div>
  );
};

export default CourseDetail;
