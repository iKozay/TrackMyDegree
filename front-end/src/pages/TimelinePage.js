import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import coursesData from '../course data/soen_courses/soen_core.json';
import Accordion from 'react-bootstrap/Accordion';
import Container from 'react-bootstrap/Container';
import soenCourses from '../course data/soen_courses';





// Semesters are currently hard coded, eventually we will load them dynamically
const semesters = [
  { id: 'fall2024', name: 'Fall 2024' },
  { id: 'winter2025', name: 'Winter 2025' },
  { id: 'summer2025', name: 'Summer 2025' },
  { id: 'fall2025', name: 'Fall 2025' },
  { id: 'winter2026', name: 'Winter 2026' },
];


// Draggable and Droppable components from the DndKit library
// https://docs.dndkit.com/
// The draggable component represents a course that can be dragged and dropped
// The droppable component represents a semester where courses can be dropped
// The TimelinePage component is the main component that contains the draggable and droppable components
// The TimelinePage component also contains the logic for handling drag and drop events
// The isCourseAssigned function checks if a course is already assigned to a semester
// The handleDragStart function is called when a course drag starts
// The handleDragEnd function is called when a course drag ends
// The handleDragCancel function is called when a course drag is cancelled
// The handleReturn function is called when a course is returned to the course list
// The TimelinePage component renders the draggable and droppable components for the course list and semesters
// The selectedCourse state is used to display the description of the selected course
// The returning state is used to indicate if a course is being returned to the course list
// The semesterCourses state is used to keep track of the courses assigned to each semester


const Draggable = ({ id, title, disabled, isDragging, isDraggingFromSemester, isReturning }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    disabled,
  });

  const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''}${isDraggingFromSemester ? ' dragging-from-semester' : ''}
  `;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={className}
    >
      {id}
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
  const [courseList] = useState(coursesData); // No need to update this state
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [returning, setReturning] = useState(false);
  const [semesterCourses, setSemesterCourses] = useState(
    semesters.reduce((acc, semester) => {
      acc[semester.id] = [];
      return acc;
    }, {})
  );

  const isCourseAssigned = (courseId) => {
    for (const semesterId in semesterCourses) {
      if (semesterCourses[semesterId].includes(courseId)) {
        return true;
      }
    }
    return false;
  };

  const handleDragStart = (event) => {
    setReturning(false);
    const id = String(event.active.id);

    const course = soenCourses
      .flatMap(courseSection => courseSection.courseList)
      .find(c => c.id === id);

    if (course) {
      setSelectedCourse(course);
    }

    const scrollContainer = document.querySelector('.semesters');
    if (scrollContainer) {
      scrollContainer.classList.add('no-scroll');
    }

    setActiveId(id);
    console.log('dragging' + activeId);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const id = String(active.id);

    if (over) {
      if (over.id === 'courseList') {
        // Course is being returned to the course list
        handleReturn(id);
      } else {
        // Course is being assigned to a semester
        setSemesterCourses((prevSemesters) => {
          const updatedSemesters = { ...prevSemesters };
          // Remove the course from any previous semester
          for (const semesterId in updatedSemesters) {
            updatedSemesters[semesterId] = updatedSemesters[semesterId].filter(
              (courseId) => courseId !== id
            );
          }
          // Add the course to the new semester
          if (Array.isArray(updatedSemesters[over.id])) {
            updatedSemesters[over.id] = [...updatedSemesters[over.id], id];
          }
          return updatedSemesters;
        });
        console.log(activeId + ' assigned to ' + over.id);
      }
    }

    setActiveId(null);

    const scrollContainer = document.querySelector('.semesters');
    if (scrollContainer) {
      scrollContainer.classList.remove('no-scroll');
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);

    const scrollContainer = document.querySelector('.semesters');
    if (scrollContainer) {
      scrollContainer.classList.remove('no-scroll');
    }
    console.log('cancelled' + activeId);
  };

  const handleReturn = (courseId) => {
    setReturning(true);
    console.log('returning');

    setSemesterCourses((prevSemesters) => {
      const updatedSemesters = { ...prevSemesters };
      for (const semesterId in updatedSemesters) {
        updatedSemesters[semesterId] = updatedSemesters[semesterId].filter(
          (id) => id !== courseId
        );
      }
      return updatedSemesters;
    });
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="timeline-page">
        <div className="timeline-left-bar">
          <h3>Course List</h3>
          <Droppable id="courseList" className="course-list">
            <Accordion alwaysOpen>
              {soenCourses.map((courseSection) => (
                <Accordion.Item eventKey={courseSection.title} key={courseSection.title}>
                  <Accordion.Header>
                    {courseSection.title}
                  </Accordion.Header>
                  <Accordion.Body>
                    <Container>
                      {courseSection.courseList.map((course) => {
                        const assigned = isCourseAssigned(course.id);
                        const isCurrentlyDragging = activeId === course.id;
                        return (
                          <Draggable
                            key={`${course.id}-${assigned}`} // Include 'assigned' in the key
                            id={course.id}
                            title={course.id}
                            disabled={assigned}
                            isDragging={isCurrentlyDragging}
                            isReturning={returning}
                          />
                        );
                      })}
                    </Container>
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          </Droppable>
        </div>

        <div className="semesters-and-description">
          <div className="semesters">
            {semesters.map((semester) => (
              <div key={semester.id} className="semester">
                <h3>{semester.name}</h3>
                {semesterCourses[semester.id].map((courseId) => {
                  const course = soenCourses
                    .flatMap(courseSection => courseSection.courseList)
                    .find(c => c.id === courseId);
                  if (!course) return null;
                  const isCurrentlyDragging = activeId === course.id;
                  return (
                    <Draggable
                      key={course.id}
                      id={course.id}
                      title={course.id}
                      disabled={false} // Courses in semesters are always draggable
                      isDraggingFromSemester={isCurrentlyDragging}
                    />
                  );
                })}
              </Droppable>
            ))}

          </div>
        </div>
        <div className="description-space">
          {selectedCourse ? (
            <div>
              <h3>{selectedCourse.title}</h3>
              <p>{selectedCourse.description}</p>
            </div>
          ) : (
            <p>Drag a course to see its description here.</p>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={returning ? null : undefined}>
        {activeId ? (
          <div className="course-item-overlay">
            {soenCourses
              .flatMap(courseSection => courseSection.courseList)
              .find(course => course.id === activeId)?.id}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TimelinePage;
