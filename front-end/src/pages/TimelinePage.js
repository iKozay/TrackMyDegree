import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const courses = [
  { id: 1, name: "Course 101", description: "This is the description for Course 101." },
  { id: 2, name: "Course 102", description: "This is the description for Course 102." },
  { id: 3, name: "Course 103", description: "This is the description for Course 103." },
  { id: 4, name: "Course 104", description: "This is the description for Course 104." },
  { id: 5, name: "Course 105", description: "This is the description for Course 105." },
  { id: 6, name: "Course 106", description: "This is the description for Course 106." },
  { id: 7, name: "Course 107", description: "This is the description for Course 107." },
  { id: 8, name: "Course 108", description: "This is the description for Course 108." },
  { id: 9, name: "Course 109", description: "This is the description for Course 109." },
  { id: 10, name: "Course 110", description: "This is the description for Course 110." },
  { id: 11, name: "Course 111", description: "This is the description for Course 111." },
  { id: 12, name: "Course 112", description: "This is the description for Course 112." },
];

const semesters = [
  { id: 'fall2024', name: 'Fall 2024' },
  { id: 'winter2025', name: 'Winter 2025' },
  { id: 'summer2025', name: 'Summer 2025' },
  { id: 'fall2025', name: 'Fall 2025' }
];

const Draggable = ({ id, name, onReturn, isHidden }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    visibility: isHidden ? 'hidden' : 'visible',
  };

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style} className="course-item">
      {name}
      <button className="return-button" onClick={(e) => {
        e.stopPropagation();
        onReturn(id);
      }}>X</button>
    </div>
  );
};

const Droppable = ({ id, children, className = 'semester-spot' }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
};

const TimelinePage = () => {
  const [activeId, setActiveId] = useState(null);
  const [courseList, setCourseList] = useState(courses);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [semesterCourses, setSemesterCourses] = useState(
    semesters.reduce((acc, semester) => {
      acc[semester.id] = [];
      return acc;
    }, {})
  );

  const handleDragStart = (event) => {
    const { id } = event.active;

    // Find the course that is being dragged using its id
    const course = courses.find((c) => c.id === id);
    if (course) {
      setSelectedCourse(course);
    }

    setActiveId(id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over) {
      // Update state immediately
      setCourseList((prevCourses) => prevCourses.filter((course) => course.id !== active.id));
      setSemesterCourses((prevSemesters) => {
        const updatedSemesters = { ...prevSemesters };
        for (const semesterId in updatedSemesters) {
          updatedSemesters[semesterId] = updatedSemesters[semesterId].filter((courseId) => courseId !== active.id);
        }
        if (Array.isArray(updatedSemesters[over.id])) {
          updatedSemesters[over.id] = [...updatedSemesters[over.id], active.id];
        } else if (over.id === 'courseList') {
          setCourseList((prevCourses) => [...prevCourses, courses.find((c) => c.id === active.id)]);
        }
        return updatedSemesters;
      });
    }
    setActiveId(null);
  };

  const handleReturn = (courseId) => {
    // Remove course from any semester it was previously in
    setSemesterCourses((prevSemesters) => {
      const updatedSemesters = { ...prevSemesters };
      for (const semesterId in updatedSemesters) {
        updatedSemesters[semesterId] = updatedSemesters[semesterId].filter((id) => id !== courseId);
      }
      return updatedSemesters;
    });
    // Add course back to the original course list
    setCourseList((prevCourses) => [...prevCourses, courses.find((c) => c.id === courseId)]);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="timeline-page">
        {/* Course List as Droppable Area */}
        <Droppable id="courseList" className="course-list">
          <h3>Course List</h3>
          {courseList.map((course) => (
            <Draggable key={course.id} id={course.id} name={course.name} onReturn={handleReturn} isHidden={activeId === course.id} />
          ))}
        </Droppable>

        {/* Semesters and Description Area */}
        <div className="semesters-and-description">
          <div className="semesters">
            {semesters.map((semester) => (
              <Droppable key={semester.id} id={semester.id}>
                <h3>{semester.name}</h3>
                {semesterCourses[semester.id].map((courseId) => {
                  const course = courses.find((c) => c.id === courseId);
                  return <Draggable key={course.id} id={course.id} name={course.name} onReturn={handleReturn} isHidden={activeId === course.id} />;
                })}
              </Droppable>
            ))}
          </div>

        </div>
        <div className="description-space">
          {selectedCourse ? (
            <div>
              <h3>{selectedCourse.name}</h3>
              <p>{selectedCourse.description}</p>
            </div>
          ) : (
            <p>Drag a course to see its description here.</p>
          )}
        </div>
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="course-item-overlay">
            {courses.find((course) => course.id === activeId)?.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TimelinePage;

/* CSS (for reference, include in your CSS file)
.timeline-page {
  display: flex;
  gap: 20px;
  height: 70vh;
  padding-bottom: 5%;
}

.course-list {
  width: 15%;
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 5px;
}

.semesters-and-description {
  width: 60%;
  display: flex;
  gap: 20px;
}

.semesters {
  flex: 3;
  display: flex;
  gap: 20px;
  overflow-x: auto;
}

.description-space {
  width: 20%;
  flex: 1;
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 5px;
  min-width: 150px;
}

.course-item {
  padding: 10px;
  margin: 5px 0;
  background-color: #d1e7dd;
  border: 1px solid #bcd0c7;
  border-radius: 3px;
  cursor: grab;
  transition: transform 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 230px;
}

.return-button {
  background-color: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.course-item-overlay {
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 3px;
  cursor: grabbing;
}

.animated-drop {
  position: absolute;
  pointer-events: none;
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  transform-origin: top left;
  padding: 10px;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 3px;
  z-index: 1000;
}

.semester-spot {
  width: 250px;
  min-height: 200px;
  background-color: #e9ecef;
  padding: 10px;
  border: 2px dashed #ced4da;
  border-radius: 5px;
  transition: background-color 0.2s ease;
}

.semester-spot:hover {
  background-color: #d4edda;
}
*/
