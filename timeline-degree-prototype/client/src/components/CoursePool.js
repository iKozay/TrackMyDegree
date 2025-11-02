import React, { useState, useEffect } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { DraggableCourse } from './DraggableCourse';

// const DraggableCourse = ({ course, isSelected, onSelect }) => {
//   const isDraggable = course.status.status !== 'completed';

//   const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
//     id: course.id,
//     disabled: !isDraggable,
//   });

//   const style = transform ? {
//     transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
//   } : undefined;

//   // statuses: "planned" | "completed" | "inprogress" | "incomplete"
//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'completed': return 'status-completed';
//       case 'planned': return 'status-planned';
//       case 'incomplete': return 'status-incomplete';
//       case 'inprogress': return 'status-inprogress';
//       default: return 'status-incomplete';
//     }
//   };

//   return (
//     <div
//       ref={setNodeRef}
//       style={style}
//   className={`course-card ${getStatusColor(course.status.status)} ${isSelected ? 'selected' : ''
//     } ${isDragging ? 'dragging' : ''} ${!isDraggable ? 'not-draggable' : ''}`}
// >
//       <div className="course-content" onClick={() => onSelect(course.id)}>
//         <div className="course-code">{course.id}</div>
//         <div className="course-name">{course.title}</div>
//         <div className="course-credits">{course.credits} cr</div>
//       </div>
//       {isDraggable && (
//         <div className="course-drag-handle" {...listeners} {...attributes}>
//           ⋮⋮
//         </div>
//       )}
//     </div>
//   );
// };

const CoursePool = ({ pools, courses, onCourseSelect, selectedCourse }) => {
  const [expandedPools, setExpandedPools] = useState({});

  // initialize/sync expansion with incoming pools (default: expanded)
  useEffect(() => {
    setExpandedPools(
      Object.fromEntries((pools || []).map(p => [p.name, false]))
    );
  }, [pools]);

  const togglePool = (name) =>
    setExpandedPools((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="course-pool">
      <h2>Course Pool</h2>
      {(Array.isArray(pools) ? pools : Object.values(pools)).map((pool, pi) => {
        const isExpanded = !!expandedPools[pool.name];

        return (
          <div key={`${pool.name}-${pi}`} className="pool-section">
            <button
              className="pool-header"
              onClick={() => togglePool(pool.name)}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <span>{pool.name}</span>
              <span className="course-count">({pool.courses.length})</span>
            </button>

            {isExpanded && (
              <div className="pool-courses">
                {pool.courses.map((courseId, ci) => {
                  const course = courses[courseId];
                  if (!course) return null;

                  return (
                    <DraggableCourse
                      key={`${pool.name}:${courseId}:${ci}`}
                      courseId={courseId}
                      course={course}
                      isSelected={selectedCourse === courseId}
                      onCourseSelect={onCourseSelect}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CoursePool;
