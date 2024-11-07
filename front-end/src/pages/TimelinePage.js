import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import coursesData from '../course data/soen_courses/soen_core.json';
import Accordion from 'react-bootstrap/Accordion';
import Container from 'react-bootstrap/Container';
import soenCourses from '../course data/soen_courses';

const semesters = [
  { id: 'fall2024', name: 'Fall 2024' },
  { id: 'winter2025', name: 'Winter 2025' },
  { id: 'summer2025', name: 'Summer 2025' },
  { id: 'fall2025', name: 'Fall 2025' },
  { id: 'winter2026', name: 'Winter 2026' },
];

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
      {title}
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
    //const course = coursesData.find((c) => c.id === id);
    const course = soenCourses.map((courseLists) => courseLists.courseList.find((c) => c.id === id));

    if (course) {
      setSelectedCourse(course);
    }

    const scrollContainer = document.querySelector('.semesters');
    if (scrollContainer) {
      scrollContainer.classList.add('no-scroll');
    }

    setActiveId(id);
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
              {/* {courseSection.subcourses !== undefined &&
                <Container style={{ padding: '15px 25px'}}>
                  <h3><b>{courseSection.subcourseTitle}</b> (Minimum of {courseSection.subcourseCredits} credits)</h3>
                  <CourseListAccordion courseList={courseSection.subcourses} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} />
                </Container>
              } */}
            </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
            {/* {courseList.map((course) => {
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
            })} */}
          </Droppable>
        </div>

        <div className="semesters-and-description">
          <div className="semesters">
            {semesters.map((semester) => (
              <Droppable key={semester.id} id={semester.id}>
                <h3>{semester.name}</h3>
                {semesterCourses[semester.id].map((courseId) => {
                  const course = soenCourses.map((courseLists) => courseLists.courseList.find((c) => c.id === courseId));
                  //const course = coursesData.find((c) => c.id === courseId);
                  const isCurrentlyDragging = activeId === course.id;
                  return (
                    <Draggable
                      key={course.id}
                      id={course.id}
                      title={course.title}
                      disabled={false} // Courses in semesters are always draggable
                      isDraggingFromSemester={isCurrentlyDragging}
                      // isReturning={returning}
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
            {soenCourses.map((courseLists) => courseLists.courseList.find((course) => course.id === activeId)?.title)}
            {/* {coursesData.find((course) => course.id === activeId)?.title} */}
          </div>
        ) : null}
      </DragOverlay>

    </DndContext>
  );
};

export default TimelinePage;
