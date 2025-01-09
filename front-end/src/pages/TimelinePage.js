import React, { useState, useEffect } from 'react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Accordion from 'react-bootstrap/Accordion';
import Container from 'react-bootstrap/Container';
import soenCourses from '../course data/soen_courses';
// import { FaExclamationTriangle } from 'react-icons/fa'; // Import warning icon
import warningIcon from '../icons/warning.png'; // Import warning icon
// Semesters are currently hard-coded
// const semesters = [
//   { id: 'fall2024', name: 'Fall 2024' },
//   { id: 'winter2025', name: 'Winter 2025' },
//   { id: 'summer2025', name: 'Summer 2025' },
//   { id: 'fall2025', name: 'Fall 2025' },
//   { id: 'winter2026', name: 'Winter 2026' },
// ];

// DraggableCourse component for course list items
const DraggableCourse = ({
  id,
  title,
  disabled,
  isReturning,
  isSelected,
  onSelect,
  containerId,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: {
      type: 'course',
      courseId: id,
      containerId,
    },
  });

  const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''
    }${isSelected && !isDragging && !disabled ? ' selected' : ''}`;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {id}
    </div>
  );
};

// SortableCourse component for semester items
const SortableCourse = ({
  id,
  title,
  disabled,
  isSelected,
  isDraggingFromSemester,
  onSelect,
  containerId,
  prerequisitesMet, // New prop
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'course',
      courseId: id,
      containerId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''
    }${isDraggingFromSemester ? ' dragging-from-semester' : ''}${isSelected ? ' selected' : ''
    }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {id}
      {!prerequisitesMet && (
        <img
          src={warningIcon}
          alt="Warning: prerequisites not met"
          className="warning-icon"
        />
      )}
    </div>
  );
};

// Droppable component
const Droppable = ({ id, children, className = 'semester-spot' }) => {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'semester',
      containerId: id,
    },
  });

  return (
    <div ref={setNodeRef} className={className} data-semester-id={id} data-testid={id}>
      {children}
    </div>
  );
};

// Main component
const TimelinePage = () => {
  const [semesters, setSemesters] = useState([]);
  const [semesterCourses, setSemesterCourses] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);

  //data
  const [activeId, setActiveId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [returning, setReturning] = useState(false);
  const [hasUnmetPrerequisites, setHasUnmetPrerequisites] = useState(false);
  const [totalCredits, setTotalCredits] = useState(0);

  // Add semester form state
  const [selectedSeason, setSelectedSeason] = useState('Fall');
  const [selectedYear, setSelectedYear] = useState('2025');

  // Sensors with activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });

  const sensors = useSensors(mouseSensor);

  // ---------------- ADD / REMOVE Semesters ----------------
  const handleAddSemester = () => {
    const seasonLower = selectedSeason.toLowerCase();
    const id = `${seasonLower}${selectedYear}`; // "fall2025"
    const name = `${selectedSeason} ${selectedYear}`;

    // Prevent duplicates
    if (semesters.some((sem) => sem.id === id)) {
      alert(`Semester ${name} is already added.`);
      return;
    }

    // Add the new semester
    setSemesters((prev) => [...prev, { id, name }]);

    // Initialize course list
    setSemesterCourses((prev) => {
      if (!prev[id]) {
        return { ...prev, [id]: [] };
      }
      return prev;
    });

    // Close modal
    setIsModalOpen(false);
  };

  const handleRemoveSemester = (semesterId) => {
    setSemesters((prev) => prev.filter((s) => s.id !== semesterId));
    setSemesterCourses((prev) => {
      const updated = { ...prev };
      delete updated[semesterId];
      return updated;
    });
  };
// ----------------------------------------------------------------------
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
      .flatMap((courseSection) => courseSection.courseList)
      .find((c) => c.id === id);

    if (course) {
      setSelectedCourse(course);
    }

    document.querySelector('.semesters')?.classList.add('no-scroll');

    setActiveId(id);
  };

  const findSemesterIdByCourseId = (courseId, semesters) => {
    for (const semesterId in semesters) {
      if (semesters[semesterId].includes(courseId)) {
        return semesterId;
      }
    }
    return null;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const id = String(active.id);

    if (over) {
      if (over.id === 'courseList') {
        // Course is being returned to the course list
        handleReturn(id);
      } else {
        setSemesterCourses((prevSemesters) => {
          const updatedSemesters = { ...prevSemesters };
          const activeSemesterId = findSemesterIdByCourseId(
            id,
            prevSemesters
          );
          let overSemesterId;
          let overIndex;

          if (over.data.current?.type === 'semester') {
            // Dropped over a semester (empty space)
            overSemesterId = over.data.current.containerId;
            overIndex = updatedSemesters[overSemesterId].length;
          } else if (over.data.current?.type === 'course') {
            // Dropped over a course in a semester
            overSemesterId = over.data.current.containerId;
            overIndex = updatedSemesters[overSemesterId].indexOf(over.id);

            if (id === over.id) {
              // Dropped back onto itself; do nothing
              return prevSemesters;
            }
          } else {
            // Fallback
            overSemesterId = findSemesterIdByCourseId(over.id, prevSemesters);
            overIndex = updatedSemesters[overSemesterId]?.indexOf(over.id);
          }

          if (activeSemesterId) {
            // Remove from old semester
            updatedSemesters[activeSemesterId] = updatedSemesters[
              activeSemesterId
            ].filter((courseId) => courseId !== id);
          }

          if (overSemesterId) {
            // Insert into new semester
            updatedSemesters[overSemesterId].splice(overIndex, 0, id);
          }

          return updatedSemesters;
        });
      }
    }

    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleDragCancel = () => {
    setActiveId(null);
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleReturn = (courseId) => {
    setReturning(true);

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

  const handleCourseSelect = (id) => {
    const course = soenCourses
      .flatMap((courseSection) => courseSection.courseList)
      .find((c) => c.id === id);
    if (course) {
      setSelectedCourse(course);
    }
  };

  // Calculate total credits whenever semesterCourses changes
  useEffect(() => {
    const calculateTotalCredits = () => {
      let total = 0;
      let unmetPrereqFound = false;

      for (const semesterId in semesterCourses) {
        const courseIds = semesterCourses[semesterId];
        const currentSemesterIndex = semesters.findIndex(
          (s) => s.id === semesterId
        );

        courseIds.forEach((courseId) => {
          const course = soenCourses
            .flatMap((courseSection) => courseSection.courseList)
            .find((c) => c.id === courseId);

          if (course && course.credits) {
            const prerequisitesMet = arePrerequisitesMet(
              courseId,
              currentSemesterIndex
            );

            if (prerequisitesMet) {
              total += course.credits;
            } else {
              unmetPrereqFound = true;
            }
          }
        });
      }

      setTotalCredits(total);
      setHasUnmetPrerequisites(unmetPrereqFound);
    };

    calculateTotalCredits();
  }, [semesterCourses, semesters]);


  // Function to check if prerequisites are met
  const arePrerequisitesMet = (courseId, currentSemesterIndex) => {
    const course = soenCourses
      .flatMap((courseSection) => courseSection.courseList)
      .find((c) => c.id === courseId);

    if (!course || !course.prerequisites || course.prerequisites.length === 0) {
      // No prerequisites, so they are met by default
      return true;
    }

    // Collect all courses scheduled in semesters before the current one
    const scheduledCourses = [];
    for (let i = 0; i < currentSemesterIndex; i++) {
      const semesterId = semesters[i].id;
      scheduledCourses.push(...semesterCourses[semesterId]);
    }

    // Check if all prerequisites are in the scheduled courses
    return course.prerequisites.every((prereqId) =>
      scheduledCourses.includes(prereqId)
    );
  };

  // ----------------------------------------------------------------------------------------------------------------------
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >

      {/* We blur the background content when modal is open */}
      <div className={`timeline-container ${isModalOpen ? 'blurred' : ''}`}>

          {/* Total Credits Display */}
          <div className="credits-display">
            <h4>
              Total Credits Earned: {totalCredits} / 120
            </h4>
          </div>

        <div className="timeline-page">

          <div className="timeline-left-bar">
            <h4>Course List</h4>
            <Droppable id="courseList" className="course-list">
              <Accordion>
                {soenCourses.map((courseSection) => (
                  <Accordion.Item
                    eventKey={courseSection.title}
                    key={courseSection.title}
                  >
                    <Accordion.Header>{courseSection.title}</Accordion.Header>
                    <Accordion.Body>
                      <Container>
                        {courseSection.courseList.map((course) => {
                          const assigned = isCourseAssigned(course.id);
                          const isSelected = selectedCourse?.id === course.id;

                          return (
                            <DraggableCourse
                              key={`${course.id}-${assigned}`} // Include assigned in key
                              id={course.id}
                              title={course.id}
                              disabled={assigned}
                              isReturning={returning}
                              isSelected={isSelected}
                              onSelect={handleCourseSelect}
                              containerId="courseList"
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
              {semesters.map((semester, index) => (
                  <div key={semester.id}>
                    <Droppable id={semester.id} color="pink">
                      <h3>{semester.name}</h3>
                      <SortableContext
                          items={semesterCourses[semester.id]}
                          strategy={verticalListSortingStrategy}
                      >
                        {semesterCourses[semester.id].map((courseId) => {
                          const course = soenCourses
                              .flatMap((sec) => sec.courseList)
                              .find((c) => c.id === courseId);
                          if (!course) return null;
                          const isSelected = selectedCourse?.id === course.id;
                          const isDraggingFromSemester = activeId === course.id;

                          // Check if prerequisites are met
                          const prerequisitesMet = arePrerequisitesMet(courseId, index);

                          return (
                              <SortableCourse
                                  key={course.id}
                                  id={course.id}
                                  title={course.id}
                                  disabled={false}
                                  isSelected={isSelected}
                                  isDraggingFromSemester={isDraggingFromSemester}
                                  onSelect={handleCourseSelect}
                                  containerId={semester.id}
                                  prerequisitesMet={prerequisitesMet} // Pass the prop
                              />
                          );
                        })}
                      </SortableContext>

                      <div className="semester-footer">
                        <div className="semester-credit">
                          Total credit:
                          {semesterCourses[semester.id]
                              .map((cid) =>
                                  soenCourses
                                      .flatMap((s) => s.courseList)
                                      .find((sc) => sc.id === cid)?.credits || 0
                              )
                              .reduce((sum, c) => sum + c, 0)}
                        </div>

                        <button
                            className="remove-semester-btn"
                            onClick={() => handleRemoveSemester(semester.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </Droppable>
                  </div>
              ))}
            </div>

            <button
                className="add-semester-button"
                onClick={() => setIsModalOpen(true)}
            >
              +
            </button>

            <div className="description-space">
              {selectedCourse ? (
                  <div>
                    <h5>{selectedCourse.title}</h5>
                    <p data-testid='course-description'>{selectedCourse.description}</p>
                    {selectedCourse.prerequisites && selectedCourse.prerequisites.length > 0 && (
                        <div>
                          <h5>Prerequisites:</h5>
                          <ul>
                            {selectedCourse.prerequisites.map((prereqId) => {
                              const prereqCourse = soenCourses
                                  .flatMap((courseSection) => courseSection.courseList)
                                  .find((c) => c.id === prereqId);
                              return (
                                  <li key={prereqId}>
                                    {prereqCourse ? (
                                        <>
                                          {prereqCourse.id}
                                        </>
                                    ) : (
                                        prereqId
                                    )}
                                  </li>
                              );
                            })}
                          </ul>
                        </div>
                    )}
                  </div>
              ) : (
                  <p data-testid='course-description'>Drag or click on a course to see its description here.</p>
              )}
            </div>

          </div>
          <DragOverlay dropAnimation={returning ? null : undefined}>
            {activeId ? (
                <div className="course-item-overlay selected">
                {soenCourses
                  .flatMap((courseSection) => courseSection.courseList)
                  .find((course) => course.id === activeId)?.id}
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </div>

      {/* ---------- Modal for Add Semester ---------- */}
      {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                  className="close-button"
                  onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
              <h2>Add a Semester</h2>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  <option>Fall</option>
                  <option>Winter</option>
                  <option>Summer</option>
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const year = 2025 + i;
                    return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                    );
                  })}
                </select>
              </div>
              <button onClick={handleAddSemester}>Add Semester</button>
            </div>
          </div>
      )}
    </DndContext>
  );
};

export default TimelinePage;
