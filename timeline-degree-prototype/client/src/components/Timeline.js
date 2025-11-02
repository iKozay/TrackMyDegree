import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Calendar, Clock } from 'lucide-react';

import { DraggableCourse } from './DraggableCourse';

const DroppableSemester = ({ semesterId, courses, semesterCourses, onCourseSelect, selectedCourse, onRemoveCourse }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: semesterId,
    data: { source: 'timeline', semesterId }

  });

  const [season, year] = semesterId.split(' ');
  const totalCredits = semesterCourses.reduce((sum, courseId) =>
    sum + (courses[courseId]?.credits || 0), 0
  );

  return (
    <div
      ref={setNodeRef}
      className={`semester ${isOver ? 'drag-over' : ''}`}
    >
      <div className="semester-header">
        <div className="semester-title">
          <Calendar size={16} />
          <span>{season.charAt(0).toUpperCase() + season.slice(1)} {year}</span>
        </div>
        <div className="semester-credits">
          <Clock size={14} />
          {totalCredits} credits
        </div>
      </div>

      <div className="semester-courses">
        {semesterCourses.length === 0 ? (
          <div className="empty-semester">
            Drop courses here
          </div>
        ) : (
          semesterCourses.map(courseId => {
            const course = courses[courseId];
            return (
              <DraggableCourse
                key={courseId}
                courseId={courseId}
                course={course}
                onCourseSelect={onCourseSelect}
                isSelected={selectedCourse === courseId}
                onRemove={() => onRemoveCourse(courseId, semesterId)}
                semesterId={semesterId}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const Timeline = ({ semesters, courses, onCourseSelect, selectedCourse, onRemoveCourse }) => {

  // Get courses assigned to each semester
  const getCoursesForSemester = (semesterId) => {
    // semesters is like: [ { "FALL 2025": [] }, { "WINTER 2026": [] }, ... ]
    const entry = Array.isArray(semesters)
      ? semesters.find(o => o && Object.prototype.hasOwnProperty.call(o, semesterId))
      : null;

    const semesterCourses = Array.isArray(entry?.[semesterId]) ? entry[semesterId] : [];
    return semesterCourses;
  };

  return (
    <div className="timeline">
      <h2>Academic Timeline</h2>
      <div className="semesters-grid">
        {semesters?.map((entry, i) => {
          const semesterId = Object.keys(entry)[0]; // e.g., "FALL 2025"
          return (
            <DroppableSemester
              key={`${semesterId}-${i}`}
              semesterId={semesterId}
              courses={courses}
              semesterCourses={getCoursesForSemester(semesterId)}
              onCourseSelect={onCourseSelect}
              selectedCourse={selectedCourse}
              onRemoveCourse={onRemoveCourse}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
