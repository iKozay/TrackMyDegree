import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
// import soenCourses from '../course data/soen_courses';
import soenCourses from '../course data/soen_courses'; // Import course data
// import { FaExclamationTriangle } from 'react-icons/fa'; // Import warning icon
import warningIcon from '../icons/warning.png'; // Import warning icon
import '../css/TimelinePage.css';

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
const TimelinePage = ({ timelineData }) => {
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]);
  const [semesterCourses, setSemesterCourses] = useState({courseList: [],});

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
  
  
  // Process timelineData and generate semesters and courses
  useEffect(() => {
    const semesterMap = {};
    const semesterNames = new Set();

    // Group courses by semester
    timelineData.forEach((data) => {
      const { term, course } = data;

      if (!semesterMap[term]) {
        semesterMap[term] = [];
      }
      semesterMap[term].push(course);
      semesterNames.add(term);
    });

    // Create an array of semesters sorted by term order
    const sortedSemesters = Array.from(semesterNames).sort((a, b) => {
      const order = { Winter: 1, Summer: 2, Fall: 3 };
      const [seasonA, yearA] = a.split(' ');
      const [seasonB, yearB] = b.split(' ');

      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }

      return order[seasonA] - order[seasonB];
    });

    // Set state for semesters and courses
    setSemesters(
      sortedSemesters.map((term) => ({
        id: term,
        name: term,
      }))
    );

    setSemesterCourses(
      Object.fromEntries(
        sortedSemesters.map((term) => [term, semesterMap[term] || []])
      )
    );
  }, [timelineData]);
  
  
  const [shakingSemesterId, setShakingSemesterId] = useState(null);



  // ---------------- ADD / REMOVE Semesters ----------------
  const SEASON_ORDER = {
    Winter: 1,
    Summer: 2,
    Fall: 3,
  };

  function compareSemesters(a, b) {
    // a.name might be "Fall 2026" => [ "Fall", "2026" ]
    const [seasonA, yearA] = a.name.split(' ');
    const [seasonB, yearB] = b.name.split(' ');

    // Convert year from string to number
    const yearNumA = parseInt(yearA, 10);
    const yearNumB = parseInt(yearB, 10);

    // First compare the numeric year
    if (yearNumA !== yearNumB) {
      return yearNumA - yearNumB;
    }
    // If same year, compare season order
    return SEASON_ORDER[seasonA] - SEASON_ORDER[seasonB];
  }

  const handleAddSemester = () => {
    const seasonLower = selectedSeason.toLowerCase();
    const id = `${selectedSeason} ${selectedYear}`;
    const name = `${selectedSeason} ${selectedYear}`;

    // Prevent duplicates
    if (semesters.some((sem) => sem.id === id)) {
      alert(`Semester ${name} is already added.`);
      return;
    }

    // 1) Add the new semester to the "semesters" array, then sort
    setSemesters((prev) => {
      const newSemesters = [...prev, { id, name }];
      newSemesters.sort(compareSemesters);
      return newSemesters;
    });

    setSemesterCourses((prev) => {
      if (!prev[id]) {
        return { ...prev, [id]: [] };
      }
      return prev;
    });

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
      if (semesterId === "courseList") continue;
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

  const shakeSemester = (semId) => {
    setShakingSemesterId(semId);
    setTimeout(() => {
      setShakingSemesterId(null);
    }, 2000);
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

          //check if we exceed the limit
          const overSemesterObj = semesters.find((s) => s.id === overSemesterId);
          if (!overSemesterObj) return prevSemesters; // safety check

          // Sum up the credits in the new semester
          const thisSemesterCourses = updatedSemesters[overSemesterId];
          let sumCredits = 0;
          for (let cId of thisSemesterCourses) {
            const course = soenCourses
                .flatMap((section) => section.courseList)
                .find((c) => c.id === cId);
            if (course?.credits) {
              sumCredits += course.credits;
            }
          }

          // Compare with max
          const maxAllowed = getMaxCreditsForSemesterName(overSemesterObj.name);

          if (sumCredits > maxAllowed) {
            // Optional: keep a visual shake
            shakeSemester(overSemesterId);
            // No revert. We still keep the course in the semester
            alert("You exceeded the limit of 15 credits per semester allowed in Gina Cody School of Engineering and Computer Science!");

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
        if (semesterId === 'courseList') continue;
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
  //The Gina Cody School of Engineering and Computer Science at Concordia University has the following credit limits for full-time students:
  //limit is 14 summer; Fall Winter 15.
  function getMaxCreditsForSemesterName(semesterName) {
    if (semesterName.toLowerCase().includes("summer")) {
      return 14;
    }
    return 15;
  }

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
            <button
            className="upload-transcript-button"
            onClick={() => navigate('/uploadTranscript')}
          >
            Upload Transcript
          </button>
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
              {semesters.map((semester, index) => {
                // 1) Calculate total credits for this semester
                const sumCredits = semesterCourses[semester.id]
                    .map((cid) =>
                        soenCourses
                            .flatMap((s) => s.courseList)
                            .find((sc) => sc.id === cid)?.credits || 0
                    )
                    .reduce((sum, c) => sum + c, 0);

                // 2) Compare to max limit
                const maxAllowed = getMaxCreditsForSemesterName(semester.name);
                const isOver = sumCredits > maxAllowed;

                // 3) “semester-credit” + conditionally add “over-limit-warning”
                const creditClass = isOver
                    ? "semester-credit over-limit-warning"
                    : "semester-credit";

                return (
                  <div key={semester.id} className={`semester ${
                      shakingSemesterId === semester.id ? 'exceeding-credit-limit' : ''
                  }`}>
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
                        <div className={creditClass}>
                          Total Credit: {sumCredits}
                          {" "}
                          {isOver && (
                              <span>
                                <br/> Over the credit limit 15
                              </span>
                          )}
                        </div>

                        <button
                            className="remove-semester-btn"
                            onClick={() => handleRemoveSemester(semester.id)}
                        >
                          <svg
                              width="1.2em"
                              height="1.2em"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1.21 14.06A2 2 0 0 1 15.8 22H8.2a2 2 0 0 1-1.99-1.94L5 6m3 0V4a2 2 0 0 1 2-2h2
                             a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>


                      </div>
                    </Droppable>
                  </div>
                )})}
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

              <p>Add a semester</p>
              <hr style={{ marginBottom: '1rem' }} />

              {/* Container for the two selects */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {/* Term Select */}
                <div className="select-container">
                  <label className="select-label">Term</label>
                  <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                  >
                    <option>Winter</option>
                    <option>Summer</option>
                    <option>Fall</option>
                  </select>
                </div>

                {/* Year Select */}
                <div className="select-container">
                  <label className="select-label">Year</label>
                  <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {Array.from({ length: 10 }).map((_, i) => {
                      const year = 2020 + i;
                      return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button className="TL-button" onClick={handleAddSemester}>
                Add new semester
              </button>
            </div>
          </div>
      )}
    </DndContext>
  );
};

export default TimelinePage;
