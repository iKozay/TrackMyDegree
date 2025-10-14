/* eslint-disable no-undef */
/* eslint-disable prettier/prettier */
// TimelinePage.js
/*eslint no-undef: "error"*/
import React from 'react';

import { useEffect, useRef, useContext, useReducer } from 'react';
import { useNavigate, useLocation, useBlocker } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CourseSidebar } from '../components/CourseSideBar';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';

import '../css/TimelinePage.css';
import { SaveTimelineModal } from '../components/SaveTimeLineModal';
import * as Sentry from '@sentry/react';
import { AuthContext } from '../middleware/AuthContext';
import { compressTimeline, decompressTimeline } from '../components/CompressDegree';
import { compareSemesters } from '../utils/SemesterUtils';
import { isCourseOfferedInSemester } from '../utils/courseUtils';
import { TimelineHeader } from '../components/TimeLineHeader';
import { SemesterColumn } from '../components/SemesterColumn';
import { ItemAddingModal } from '../components/ItemAddingModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ShareModal } from '../components/ShareModal';
import { AddSemesterModal } from '../components/AddSemesterModal'
import { CourseDescription } from '../components/CourseDescription';
import { TopBar } from '../components/TopBar';
import { api } from '../api/http-api-client';
import {
  buildTimelinePayload,
  getTimelineInfo,
  parseCourses,
  sortSemesters,
  buildSemesterMap,
  isTheCourseAssigned,
  getMaxCreditsForSemesterName,
  removeCourseFromSemester,
  calculateSemesterCredits,
  generateUniqueId,
  findSemesterIdByCourseCode,
  areRequisitesMet,
  calculatedCreditsRequired,
  calculateTotalCredits2,
  formatSemesters,
  generateSemesterCourses,

} from '../utils/timelineUtils';

import { timelineReducer, initialState } from '../reducers/timelineReducer';

import { useFetchCoursesByDegree } from '../hooks/useFetchCoursesByDegree';
import { useLoadTimelineFromUrl } from '../hooks/useLoadTimelineFromUrl';
import { useFetchAllCourses } from '../hooks/useFetchAllCourses';

const REACT_APP_CLIENT = process.env.REACT_APP_CLIENT || 'localhost:3000' // Set client URL

const TimelinePage = ({ degreeId, timelineData, creditsRequired, isExtendedCredit }) => {

  // TODO: Too many use state hooks that are tighly coupled, consider useReducer or splitting into smaller components

  const [state, dispatch] = useReducer(timelineReducer, initialState);
  const navigate = useNavigate();

  const { user } = useContext(AuthContext);
  const location = useLocation();
  const scrollWrapperRef = useRef(null);

  let { degree_Id, startingSemester, credits_Required, extendedCredit } = location.state || {};

  if (isExtendedCredit) {
    extendedCredit = true;
  }

  if (isExtendedCredit === null && extendedCredit === null) {
    extendedCredit = false;
  }

  if (!degree_Id) {
    degree_Id = degreeId;
  }
  const toggleCourseList = () => dispatch({ type: 'SET', payload: { showCourseList: !state.showCourseList } });
  const toggleCourseDescription = () => dispatch({ type: 'SET', payload: { showCourseDescription: !state.showCourseDescription } });
  const setShowExemptionsModal = (value) => dispatch({ type: 'SET', payload: { showExemptionsModal: value } });
  const setShowDeficiencyModal = (value) => dispatch({ type: 'SET', payload: { showDeficiencyModal: value } });
  const setShowSaveModal = (value) => dispatch({ type: 'SET', payload: { showSaveModal: value } });
  const setShowLeaveModal = (value) => dispatch({ type: 'SET', payload: { showLeaveModal: value } });
  const setSearchQuery = (value) => dispatch({ type: 'SET', payload: { searchQuery: value } });
  const setHasUnsavedChanges = (value) => dispatch({ type: 'SET', payload: { hasUnsavedChanges: value } });
  const setIsModalOpen = (value) => dispatch({ type: 'SET', payload: { isModalOpen: value } });


  const ecpFromUrl = useLoadTimelineFromUrl(dispatch, state.exemptionCodes);
  if (ecpFromUrl !== null) {
    extendedCredit = ecpFromUrl;
  }

  useEffect(() => {
    const tempId = state.tempDegId || degree_Id;
    if (state.allCourses.length > 0 && tempId !== null && state.exemptionCodes.length > 0) {
      fetch(`/degree-reqs/${tempId}-requirements.txt`)
        .then(res => res.text())
        .then(data => {
          const courseListData = data.split('\n').map(s => s.trim().replaceAll(' ', ''));
          for (const code of state.exemptionCodes) {
            if (courseListData.includes(code)) {
              console.log('added', code);
              addExemptionCourse(state.allCourses.find(course => course.code === code));
            }
          }
        });
    }
  }, [state.allCourses, state.tempDegId, degree_Id, state.exemptionCodes]);

  useEffect(() => {
    const exemptionCoursesFromTimeline = (timelineData.find(
      (semester) => semester.term.toLowerCase() === 'exempted 2020'
    ) || {}).courses || [];

    dispatch({
      type: 'SET',
      payload: {
        exemptionCodes: exemptionCoursesFromTimeline,
      },
    });
  }, [timelineData]);

  // Handle internal navigation (React)
  useBlocker(({ nextLocation }) => {
    if (state.hasUnsavedChanges) {
      dispatch({ type: 'SET', payload: { nextPath: nextLocation.pathname, showLeaveModal: true } });
      return true; // Block navigation
    }
    return false; // Allow navigation
  });

  // Handle external navigation
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (state.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = "You have unsaved changes. Are you sure you want to leave?"; // Custom message
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  // NEW: Fetch all courses from /courses/getAllCourses
  useFetchAllCourses(dispatch, extendedCredit);

  // Fetch courses when degreeId or extendedCredit changes
  useFetchCoursesByDegree(degree_Id, extendedCredit, dispatch);

  // Sensors with activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Process timelineData and generate semesters and courses
  useEffect(() => {
    // Wait until coursePools have loaded.
    if (state.coursePools.length === 0) return;
    const timelineInfo = getTimelineInfo(timelineData, state.semesterCourses);
    const { nonExemptedData, parsedExemptedCourses, deficiency, extendedC } = parseCourses(timelineInfo, state.courseInstanceMap, state.allCourses, extendedCredit);
    extendedCredit = extendedC;
    const { semesterMap, semesterNames } = buildSemesterMap(nonExemptedData, parsedExemptedCourses, startingSemester);
    const sortedSemesters = sortSemesters(semesterNames);
    const formattedSemesters = formatSemesters(sortedSemesters);
    const { newSemesterCourses,
      newCourseInstanceMap,
      newUniqueCounter } = generateSemesterCourses(sortedSemesters, semesterMap, state.courseInstanceMap, state.uniqueIdCounter);

    dispatch({
      type: 'SET',
      payload: {
        semesters: formattedSemesters,
        semesterCourses: newSemesterCourses,
        courseInstanceMap: newCourseInstanceMap,
        uniqueIdCounter: newUniqueCounter,
        deficiencyCourses: deficiency.courses,
        deficiencyCredits: deficiency.credits,
      },
    });


  }, [timelineData, state.coursePools, extendedCredit, startingSemester]);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth > 767;
      const addButtonText = window.innerWidth > 999 ? '+ Add Semester' : '+';

      dispatch({
        type: 'SET',
        payload: { isDesktop, addButtonText },
      });
    };

    window.addEventListener('resize', handleResize);

    // Call once initially to set the correct values
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!state.isDesktop) {
      dispatch({ type: 'SET', payload: { showCourseList: false, showCourseDescription: false } });
      // }
    }
  }, [state.isDesktop]);

  // TODO: Move to constants file
  const ECP_EXTRA_CREDITS = 30; // Extra credits for ECP students

  useEffect(() => {
    const { total, unmetPrereqFound } = calculateTotalCredits2(
      state.semesterCourses,
      state.semesters,
      state.coursePools,
      getRemainingCourses(),
      state.courseInstanceMap,
      state.allCourses,

    );
    console.log("Total credits recalculated:", total, "Unmet prerequisites found:", unmetPrereqFound);
    // Dispatch updates
    dispatch({
      type: 'SET',
      payload: {
        totalCredits: total,
        hasUnmetPrerequisites: unmetPrereqFound,
      },
    });
  }, [
    state.semesterCourses,
    state.semesters,
    state.coursePools,
    state.courseInstanceMap,
    state.allCourses,
  ]);

  useEffect(() => {

    let creds = calculatedCreditsRequired(state.coursePools);

    if (extendedCredit) {
      creds += ECP_EXTRA_CREDITS;
    }
    // setCredsReq(creds);
    dispatch({ type: 'SET', payload: { credsReq: creds } });
  }, [state.coursePools]);


  useEffect(() => {

    if (Object.keys(state.semesterCourses).length <= 1) {
      return;
    }
    const newTimelineString = compressTimeline(state.semesterCourses, degreeId, credits_Required, extendedCredit);
    if (state.timelineString === null) {
      dispatch({ type: 'SET', payload: { timelineString: newTimelineString } });
      return;
    }

    if (state.timelineString === newTimelineString) return;

    dispatch({
      type: 'SET',
      payload: {
        history: [...state.history, state.timelineString],
        future: [],
        timelineString: newTimelineString,
      },
    });
  }, [state.semesterCourses]);



  // ----------------------------------------------------------------------
  // NEW: Compute remaining courses not in the degree's course pools
  const getRemainingCourses = () => {
    const normalizedDegreeCourseCodes = new Set(
      state.coursePools.flatMap((pool) =>
        pool.courses.map((course) => course.code.trim().toUpperCase()),
      ),
    );


    const remainingCourses = state.allCourses.filter(
      (course) =>
        !normalizedDegreeCourseCodes.has(course.code.trim().toUpperCase()),
    );
    return remainingCourses;
  }

  const handleAddSemester = (id, name) => {

    // Prevent duplicates
    if (state.semesters.some((sem) => sem.id === id)) {
      alert(`Semester ${name} is already added.`);
      return;
    }

    dispatch({
      type: 'SET',
      payload: {
        hasUnsavedChanges: true,
        semesters: [...state.semesters, { id, name }].sort(compareSemesters),
        semesterCourses: state.semesterCourses[id]
          ? state.semesterCourses
          : { ...state.semesterCourses, [id]: [] },
        isModalOpen: false,
      },
    });
  };

  const handleRemoveSemester = (semesterId) => {
    dispatch({
      type: 'SET',
      payload: {
        semesters: state.semesters.filter((s) => s.id !== semesterId),
        semesterCourses: Object.fromEntries(
          Object.entries(state.semesterCourses).filter(([key]) => key !== semesterId)
        ),
        hasUnsavedChanges: true,
      },
    });
  };
  const isCourseAssigned = (courseCode) => {
    return isTheCourseAssigned(courseCode, state.semesterCourses, state.courseInstanceMap);
  };
  const handleDragStart = (event) => {
    const internalId = String(event.active.id);
    const courseCode = event.active.data.current.courseCode;
    const course =
      state.allCourses.find((c) => c.code === courseCode) ||
      state.deficiencyCourses.find((c) => c.code === courseCode);

    dispatch({
      type: 'SET',
      payload: {
        returning: false,
        activeCourseCode: courseCode,
        selectedCourse: course || null,
        activeId: internalId,
      },
    });
  };
  const shakeSemester = (semId) => {
    dispatch({ type: 'SET', payload: { shakingSemesterId: semId } });
    setTimeout(() => {
      dispatch({ type: 'SET', payload: { shakingSemesterId: null } });
    }, 2000);
  };


  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      dispatch({ type: 'SET', payload: { activeId: null } });
      document.querySelector('.semesters')?.classList.remove('no-scroll');
      return;
    }

    const uniqueId = String(active.id);
    const draggedGeneric = active.data.current.courseCode;
    const sourceContainer = active.data.current.containerId;
    const isFromDeficiencyList = sourceContainer === 'deficiencyList';

    let draggedId = uniqueId;
    let newCourseInstanceMap = { ...state.courseInstanceMap };
    let newUniqueIdCounter = state.uniqueIdCounter;

    if (sourceContainer === 'courseList' || isFromDeficiencyList) {
      draggedId = generateUniqueId(draggedGeneric, newUniqueIdCounter);
      newUniqueIdCounter++;
      newCourseInstanceMap[draggedId] = draggedGeneric;
    }

    // Determine target semester and index
    let overSemesterId = null;
    let overIndex = 0;

    if (over.data.current?.type === 'semester') {
      overSemesterId = over.data.current.containerId;
      overIndex = state.semesterCourses[overSemesterId]?.length || 0;
    } else {
      overSemesterId = over.data.current.containerId || findSemesterIdByCourseCode(over.id, state.semesterCourses);
      overIndex = state.semesterCourses[overSemesterId]?.indexOf(over.id) ?? 0;
    }

    // Remove from old semester
    let updatedSemesterCourses = removeCourseFromSemester(draggedId, state.semesterCourses);

    // Avoid duplicates
    const exists = updatedSemesterCourses[overSemesterId]?.some(
      (code) => (newCourseInstanceMap[code] || code) === draggedGeneric
    );
    if (exists) return;

    // Insert into new semester
    if (!updatedSemesterCourses[overSemesterId]) updatedSemesterCourses[overSemesterId] = [];
    updatedSemesterCourses[overSemesterId].splice(overIndex, 0, draggedId);

    // Check credit limit
    const overSemesterObj = state.semesters.find((s) => s.id === overSemesterId);
    if (overSemesterObj) {
      const sumCredits = calculateSemesterCredits(
        overSemesterId,
        updatedSemesterCourses,
        newCourseInstanceMap,
        state.allCourses
      );
      const maxAllowed = getMaxCreditsForSemesterName(overSemesterObj.name);
      if (sumCredits > maxAllowed) shakeSemester(overSemesterId);
    }

    // Dispatch all updates at once
    dispatch({
      type: 'SET',
      payload: {
        semesterCourses: updatedSemesterCourses,
        courseInstanceMap: newCourseInstanceMap,
        uniqueIdCounter: newUniqueIdCounter,
        activeId: null,
        hasUnsavedChanges: true,
      },
    });

    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };


  const handleDragCancel = () => {
    // setActiveId(null);
    dispatch({ type: 'SET', payload: { activeId: null } });
    document.querySelector('.semesters')?.classList.remove('no-scroll');
  };

  const handleReturn = (courseCode) => {
    const updatedSemesters = { ...state.semesterCourses };
    for (const semesterId in updatedSemesters) {
      updatedSemesters[semesterId] = updatedSemesters[semesterId].filter(
        (code) => code !== courseCode
      );
    }

    dispatch({
      type: 'SET',
      payload: {
        returning: true,
        hasUnsavedChanges: true,
        semesterCourses: updatedSemesters,
      },
    });
  };

  const handleCourseSelect = (code) => {
    let genericCode = code;
    if (code.startsWith("source-")) {
      genericCode = code.replace("source-", "");
    } else {
      genericCode = state.courseInstanceMap[code] || code;
    }
    const course = state.allCourses.find((c) => c.code === genericCode);
    if (course) {
      // setSelectedCourse(course);
      dispatch({ type: 'SET', payload: { selectedCourse: course } });
    }
  };



  const addDeficiencyCourse = (course) => {
    const alreadyAdded = state.deficiencyCourses.some(c => c.code === course.code);

    console.log("state.deficiencyCredits:", state.deficiencyCredits);

    if (alreadyAdded) {
      alert("Course already added to deficiencies!");
      return;
    }

    alert("Course added to deficiencies!");
    dispatch({
      type: 'SET',
      payload: {
        deficiencyCourses: [...state.deficiencyCourses, course],
        deficiencyCredits: state.deficiencyCredits + (course.credits || 0),
      },
    });
  };

  const removeDeficiencyCourse = (course) => {
    dispatch({
      type: 'SET',
      payload: {
        deficiencyCourses: state.deficiencyCourses.filter((c) => c.code !== course.code),
        deficiencyCredits: state.deficiencyCredits - (course.credits || 0),
      },
    });
  };


  const addExemptionCourse = (course) => {
    const alreadyAdded = state.exemptionCourses.some((c) => c.code === course.code);
    if (alreadyAdded) {
      alert("Course already added to exemptions!");
      return;
    }

    alert("Course added to exemptions!");

    dispatch({
      type: 'SET',
      payload: {
        exemptionCourses: [...state.exemptionCourses, course],
        exemptionCredits: state.exemptionCredits + (course.credits || 0),
      },
    })
  };

  const removeExemptionCourse = (course) => {
    // setExemptionCourses((prev) => prev.filter((c) => c.code !== course.code));
    // setExemptionCredits((prev) => prev - (course.credits || 0));
    dispatch({
      type: 'SET',
      payload: {
        exemptionCourses: state.exemptionCourses.filter((c) => c.code !== course.code),
        exemptionCredits: state.exemptionCredits - (course.credits || 0),
      },
    });
  };

  const arePrerequisitesMet = (courseCode, currentSemesterIndex) => {
    return areRequisitesMet(courseCode, currentSemesterIndex, state.courseInstanceMap, state.allCourses, state.semesters, state.semesterCourses);
  };

  const confirmSaveTimeline = async (tName) => {

    const { user_id, timelineNameToSend, items, isExtended, exempted_courses, error } = buildTimelinePayload({
      tName,
      user,
      degree_Id,
      semesters: state.semesters,
      semesterCourses: state.semesterCourses,
      courseInstanceMap: state.courseInstanceMap,
      allCourses: state.allCourses,
      deficiencyCourses: state.deficiencyCourses,
      extendedCredit,
    });

    if (error) {
      alert(error);
      if (error === "No valid data to save.") {
        setHasUnsavedChanges(false);

      }
      else if (error === "User must be logged in!") {
        navigate('/signin');
      }
      return;
    }



    // Save Exempted Courses (if needed)
    // TODO: Two separate try-catch blocks for exemptions and timeline saves
    // Consider using Promise.all() to save both simultaneously
    // Or combine into single transaction with better error recovery
    try {
      await Promise.all([
        api.post("/exemption/create", {
          coursecodes: exempted_courses,
          user_id,
        }),
        api.post("/timeline/save", {
          timeline: {
            user_id,
            name: timelineNameToSend,
            items,
            degree_id: degree_Id,
            isExtendedCredit: isExtended,
          },
        }),
      ]);

      alert("Timeline and exempted courses saved successfully!");
      dispatch({
        type: 'SET',
        payload: {
          hasUnsavedChanges: false,
          showSaveModal: false,
          timelineName: tName,
        },
      });

      setTimeout(() => {
        navigate("/user");
      }, 250);
    } catch (error) {
      Sentry.captureException(error);
      console.error("Error saving timeline or exemptions:", error);
      alert(`An error occurred while saving: ${error.message}`);
    }
  };

  // Compute the first occurrence for each course in the timeline (ignoring exempted semesters)
  const getFirstOccurrence = () => {
    const firstOccurrence = {};
    state.semesters.forEach((sem, index) => {
      if (sem.id.toLowerCase() === 'exempted') return;
      const courseInstances = state.semesterCourses[sem.id] || [];
      courseInstances.forEach((instanceId) => {
        const genericCode = state.courseInstanceMap[instanceId] || instanceId;
        // Only set it once, for the first occurrence
        if (firstOccurrence[genericCode] === undefined) {
          firstOccurrence[genericCode] = index;
        }
      });
    });

    return firstOccurrence;
  };

  const handleUndo = () => {
    if (state.history.length > 0) {
      const prevStr = state.history[state.history.length - 1];
      const [decompressedTimeline] = decompressTimeline(prevStr);

      dispatch({
        type: "SET",
        payload: {
          semesterCourses: decompressedTimeline,
          timelineString: prevStr,
          history: state.history.slice(0, -1),
          future: [state.timelineString, ...state.future],
        },
      });
    }
  }

  const handleRedo = () => {
    if (state.future.length > 0) {
      const nextStr = state.future[0];
      const [decompressedTimeline] = decompressTimeline(nextStr);

      dispatch({
        type: "SET",
        payload: {
          semesterCourses: decompressedTimeline,
          timelineString: nextStr,
          history: [...state.history, state.timelineString],
          future: state.future.slice(1),
        },
      });
    }
  }

  const toggleShareDialog = () => {
    // setIsShareVisible(!isShareVisible);
    dispatch({ type: 'SET', payload: { isShareVisible: !state.isShareVisible } });
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${REACT_APP_CLIENT}/timeline_change?tstring=${compressTimeline(state.semesterCourses, degree_Id, state.credsReq, extendedCredit)}`)
      .catch(() => alert("Something went wrong"));
    toggleShareDialog();
  }


  // ----------------------------------------------------------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* We blur the background content when modal is open */}
        <div className={`timeline-container ${state.isModalOpen ? 'blurred' : ''}`}>
          {/* Loading and Error States */}
          {state.loading && (
            <div className="loading-container">
              <p>Loading courses...</p>
            </div>
          )}

          {state.error && (
            <div className="error-container">
              <p>Error: {state.error}</p>
            </div>
          )}

          {!state.loading && !state.error && (
            <>
              {/* Total Credits Display */}
              <TopBar
                history={state.history}
                future={state.future}
                handleUndo={handleUndo}
                handleRedo={handleRedo}
                toggleShareDialog={toggleShareDialog}
                totalCredits={state.totalCredits}
                deficiencyCredits={state.deficiencyCredits}
                credsReq={state.credsReq}
                exemptionCredits={state.exemptionCredits}
                coursePools={state.coursePools}
                semesterCourses={state.semesterCourses}
                courseInstanceMap={state.courseInstanceMap}
                setShowDeficiencyModal={setShowDeficiencyModal}
                setShowExemptionsModal={setShowExemptionsModal}
                setShowSaveModal={setShowSaveModal}

              />

              <div className="timeline-page">
                <CourseSidebar
                  showCourseList={state.showCourseList}
                  toggleCourseList={toggleCourseList}
                  searchQuery={state.searchQuery}
                  setSearchQuery={setSearchQuery}
                  coursePools={state.coursePools}
                  remainingCourses={getRemainingCourses()}
                  deficiencyCourses={state.deficiencyCourses}
                  exemptionCourses={state.exemptionCourses}
                  deficiencyCredits={state.deficiencyCredits}
                  exemptionCredits={state.exemptionCredits}
                  selectedCourse={state.selectedCourse}
                  returning={state.returning}
                  isCourseAssigned={isCourseAssigned}
                  onSelect={handleCourseSelect}
                  removeDeficiencyCourse={removeDeficiencyCourse}
                  removeExemptionCourse={removeExemptionCourse}
                />


                <div className="timeline-middle-section">
                  <TimelineHeader timelineName={state.timelineName} addButtonText={state.addButtonText} onAddSemester={() => setIsModalOpen(true)} />

                  <div
                    className="timeline-scroll-wrapper"
                    ref={scrollWrapperRef}
                    onWheel={(e) => {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }}
                  >
                    <div className="semesters">
                      {Object.keys(state.semesterCourses).map((semesterName, index) => (
                        <SemesterColumn
                          key={semesterName}
                          semesterName={semesterName}
                          courses={state.semesterCourses[semesterName]}
                          courseInstanceMap={state.courseInstanceMap}
                          allCourses={state.allCourses}
                          selectedCourse={state.selectedCourse}
                          activeId={state.activeId}
                          handleCourseSelect={handleCourseSelect}
                          handleReturn={handleReturn}
                          firstOccurrence={getFirstOccurrence()}
                          coursePools={state.coursePools}
                          remainingCourses={getRemainingCourses()}
                          getMaxCreditsForSemesterName={getMaxCreditsForSemesterName}
                          handleRemoveSemester={handleRemoveSemester}
                          arePrerequisitesMet={arePrerequisitesMet}
                          isCourseOfferedInSemester={isCourseOfferedInSemester}
                          index={index}
                          shakingSemesterId={state.shakingSemesterId}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <CourseDescription selectedCourse={state.selectedCourse} showCourseDescription={state.showCourseDescription} toggleCourseDescription={toggleCourseDescription} />
                <DragOverlay dropAnimation={null}>
                  {state.activeId ? (
                    <div className="course-item-overlay selected">
                      {state.activeCourseCode}
                    </div>
                  ) : null}
                </DragOverlay>

              </div>
            </>
          )}
        </div>

        {/* ---------- Modal for Add Semester ---------- */}
        {state.isModalOpen && (
          <AddSemesterModal onClose={setIsModalOpen} handleAddSemester={handleAddSemester} />
        )}
        {state.isShareVisible && (

          <ShareModal
            open={state.isShareVisible}
            onClose={toggleShareDialog}
            semesterCourses={state.semesterCourses}
            degree_Id={degree_Id}
            credsReq={state.credsReq}
            extendedCredit={extendedCredit}
            copyToClipboard={copyToClipboard}
            compressTimeline={compressTimeline}

          />

        )}
        {state.showSaveModal && (
          <SaveTimelineModal
            open={state.showSaveModal}
            onClose={() => setShowSaveModal(false)}
            onSave={(name) => confirmSaveTimeline(name)}
            initialValue={state.timelineName}
          />
        )}
        {/* Leave Confirm Modal */}
        <ConfirmModal
          open={state.showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          title="Warning"
          message="You have unsaved changes. Do you really want to leave?"
          confirmLabel="Leave Anyways"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => {
            setHasUnsavedChanges(false);
            setTimeout(() => navigate(state.nextPath), 250);
          }}
        />
        {/* Adding D and E */}
        {state.showDeficiencyModal && (
          <ItemAddingModal title={"Add Deficiency Courses"} allCourses={state.allCourses} onClose={setShowDeficiencyModal} onAdd={addDeficiencyCourse} />
        )}
        {state.showExemptionsModal && (
          <ItemAddingModal title={"Add Exempted Courses"} allCourses={state.allCourses} onClose={setShowExemptionsModal} onAdd={addExemptionCourse} />
        )}
      </DndContext>
    </motion.div>
  );
};

export default TimelinePage;
