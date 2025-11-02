import React from 'react';
import { Book, Clock, Calendar, LucideAlarmMinus, CheckCircle, AlertCircle } from 'lucide-react';
import { RequisiteGroups } from './RequisiteGroups';
const CourseDetails = ({ course, courses }) => {
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="status-icon completed" size={16} />;
      case 'planned':
        return <Calendar className="status-icon planned" size={16} />;
      case 'incomplete':
        return < LucideAlarmMinus className="status-icon incomplete" size={16} />;
      case 'inprogress':
        return <AlertCircle className="status-icon inprogress" size={16} />;
      default:
        return < LucideAlarmMinus className="status-icon incomplete" size={16} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'planned': return 'Planned';
      case 'inprogress': return 'In progress';
      case 'incomplete': return 'Incomplete';
      default: return 'Incomplete';
    }
  };

  return (
    <div className="course-details">
      <div className="course-header">
        <h2>{course.code}</h2>
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
          <span>Offered in: {course.offeredIN.join(', ')}</span>
        </div>

        {course.status.semester && (
          <div className="info-item">
            <Calendar size={16} />
            <span>Scheduled: {course.status.semester}</span>
          </div>
        )}
      </div>
      <RequisiteGroups
        title="Prerequisites"
        groups={course.prerequisites}   // [{ anyOf: [...] }, ...]
        courses={courses}               // lookup: { [id]: courseObj }
      />

      <RequisiteGroups
        title="Corequisites"
        groups={course.corequisites}
        courses={courses}
      />
    </div>
  );
};

export default CourseDetails;
