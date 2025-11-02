import React from 'react';

import { useRef, useContext, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CourseSidebar } from '../components/CourseSideBar';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';

import '../css/TimelinePage.css';
import { SaveTimelineModal } from '../components/SaveTimeLineModal';
import { AuthContext } from '../middleware/AuthContext';

import { isCourseOfferedInSemester } from '../utils/courseUtils';
import { TimelineHeader } from '../components/TimeLineHeader';
import { SemesterColumn } from '../components/SemesterColumn';
import { ItemAddingModal } from '../components/ItemAddingModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { ShareModal } from '../components/ShareModal';
import { AddSemesterModal } from '../components/AddSemesterModal';
import { CourseDescription } from '../components/CourseDescription';
import { TopBar } from '../components/TopBar';
import { getMaxCreditsForSemesterName, areRequisitesMet, SaveTimeline } from '../utils/timelineUtils';
import { compressTimeline } from '../components/CompressDegree';
import { Toast, notifyError, notifySuccess } from '../components/Toast';
import { timelineReducer, initialState } from '../reducers/timelineReducer';

import { useFetchCoursesByDegree } from '../hooks/useFetchCoursesByDegree';
import { useLoadTimelineFromUrl } from '../hooks/useLoadTimelineFromUrl';
import { useFetchAllCourses } from '../hooks/useFetchAllCourses';
import { useCalculateTotalCredits } from '../hooks/useCalculateTotalCredits';
import { useRemainingCourses } from '../hooks/useRemainingCourses';
import { useFetchDegreeRequirements } from '../hooks/useFetchDegreeRequirements';
import { useCreditsRequired } from '../hooks/useCreditsRequired';
import { useBuildTimeline } from '../hooks/useBuildTimeline';
import { useFirstOccurrence } from '../hooks/useFirstOccurence';
import { useTimelineNavigation } from '../hooks/useTimelineNavigation';
import { useTimelineActions } from '../hooks/useTimeLineActions';
import { useTimeLineCompression } from '../hooks/useTimeLineCompression';
import { useResponsiveUI } from '../hooks/useResponsiveUI';
import { useDegreeInitialization } from '../hooks/useDegreeInitialization';
import { useNavigationBlocker } from '../hooks/useNavigationBlocker';
import { useDragSensors } from '../hooks/useDragSensors';
import { useCourseDrag } from '../hooks/useCourseDrag';
import * as Sentry from '@sentry/react';
import { useBlocker } from 'react-router-dom';

const REACT_APP_CLIENT = process.env.REACT_APP_CLIENT || 'localhost:3000'; // Set client URL

const TimelinePage = ({ degreeId, timelineData, creditsRequired, isExtendedCredit }) => {
  // Global state management
  const [state, dispatch] = useReducer(timelineReducer, initialState);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const scrollWrapperRef = useRef(null);

  // ------------------ Initial Setup ------------------
  let { degree_Id, startingSemester, credits_Required, extendedCredit } = useDegreeInitialization(
    degreeId,
    isExtendedCredit,
  );

  //----------------------------- State Setters ---------------------
  const toggleCourseList = () => dispatch({ type: 'SET', payload: { showCourseList: !state.showCourseList } });
  const toggleCourseDescription = () =>
    dispatch({ type: 'SET', payload: { showCourseDescription: !state.showCourseDescription } });
  const setShowExemptionsModal = (value) => dispatch({ type: 'SET', payload: { showExemptionsModal: value } });
  const setShowDeficiencyModal = (value) => dispatch({ type: 'SET', payload: { showDeficiencyModal: value } });
  const setShowSaveModal = (value) => dispatch({ type: 'SET', payload: { showSaveModal: value } });
  const setShowLeaveModal = (value) => dispatch({ type: 'SET', payload: { showLeaveModal: value } });
  const setSearchQuery = (value) => dispatch({ type: 'SET', payload: { searchQuery: value } });
  const setHasUnsavedChanges = (value) => dispatch({ type: 'SET', payload: { hasUnsavedChanges: value } });
  const setIsModalOpen = (value) => dispatch({ type: 'SET', payload: { isModalOpen: value } });
  const toggleShareDialog = () => {
    dispatch({ type: 'SET', payload: { isShareVisible: !state.isShareVisible } });
  };

  //---------------------shared timeline from url ---------------------
  const ecpFromUrl = useLoadTimelineFromUrl(dispatch);
  if (ecpFromUrl !== null) {
    extendedCredit = ecpFromUrl;
  }

  // ---------------- Timeline Actions ----------------
  const { addCourse, removeCourse, addSemester, removeSemester } = useTimelineActions(state, dispatch);
  // Courses
  const addExemptionCourse = (course) => addCourse(course, 'exemption');
  const addDeficiencyCourse = (course) => addCourse(course, 'deficiency');
  const removeExemptionCourse = (course) => removeCourse(course, 'exemption');
  const removeDeficiencyCourse = (course) => removeCourse(course, 'deficiency');

  // Semesters
  const handleAddSemester = (id, name) => addSemester(id, name);
  const handleRemoveSemester = (id) => removeSemester(id);

  const arePrerequisitesMet = (courseCode, currentSemesterIndex) => {
    return areRequisitesMet(
      courseCode,
      currentSemesterIndex,
      state.courseInstanceMap,
      state.allCourses,
      state.semesters,
      state.semesterCourses,
    );
  };
  const confirmSaveTimeline = async (tName) => {
    try {
      const { error } = await SaveTimeline(tName, user, degree_Id, state, extendedCredit);
      if (error) {
        notifyError(error);
        if (error === 'No valid data to save.') {
          dispatch({ type: 'SET', payload: { hasUnsavedChanges: false } });
        } else if (error === 'User must be logged in!') {
          dispatch({ type: 'SET', payload: { hasUnsavedChanges: false } });
          setTimeout(() => {
            navigate('/signin');
          }, 250);
        }
        return;
      }
      notifySuccess('Timeline and exemptions saved successfully!');
      dispatch({
        type: 'SET',
        payload: {
          hasUnsavedChanges: false,
          showSaveModal: false,
          timelineName: tName,
        },
      });

      setTimeout(() => {
        navigate('/user');
      }, 250);
    } catch (err) {
      Sentry.captureException(err);
      console.error('Error saving timeline or exemptions:', err);
      notifyError(`An error occurred while saving: ${err.message}`);
    }
  };

  // ---------------- Data Fetching & Initialization ----------------
  useFetchDegreeRequirements(state, degree_Id, addExemptionCourse);
  useFetchAllCourses(dispatch, extendedCredit);
  useFetchCoursesByDegree(state.tempDegId ? state.tempDegId : degree_Id, extendedCredit, dispatch);

  // ------------------ Timeline Building & Updates & Undo ------------------
  const computedExtendedCredit = useBuildTimeline({
    timelineData,
    state,
    startingSemester,
    extendedCredit,
    dispatch,
  });
  if (computedExtendedCredit !== extendedCredit) {
    extendedCredit = computedExtendedCredit;
  }
  const remainingCourses = useRemainingCourses(state.coursePools, state.allCourses);
  useCalculateTotalCredits(state, dispatch, remainingCourses);
  useCreditsRequired(state, extendedCredit, dispatch);
  useTimeLineCompression(state, dispatch, degreeId, credits_Required, extendedCredit);
  const firstOccurrence = useFirstOccurrence(state.semesters, state.semesterCourses, state.courseInstanceMap);
  const { handleUndo, handleRedo } = useTimelineNavigation(state, dispatch);

  // --------------- block or unblock navigation ----------------------
  useNavigationBlocker(state.hasUnsavedChanges);
  // Handle internal navigation (React)
  useBlocker(({ nextLocation }) => {
    if (state.hasUnsavedChanges) {
      dispatch({ type: 'SET', payload: { nextPath: nextLocation.pathname, showLeaveModal: true } });
      return true; // Block navigation
    }
    return false; // Allow navigation
  });

  //----------------- window size reponsivness-----------------
  useResponsiveUI(dispatch);

  // ---------------------------- drag courses ---------------
  const sensors = useDragSensors();
  const { isCourseAssigned, handleDragStart, handleDragEnd, handleDragCancel, handleReturn, handleCourseSelect } =
    useCourseDrag(state, dispatch);

  // --------------------------Share url to build timeline ----------------
  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(
        `${REACT_APP_CLIENT}/timeline_change?tstring=${compressTimeline(state.semesterCourses, degree_Id, state.credsReq, extendedCredit)}`,
      )
      .catch(() => notifyError('Something went wrong'));
    toggleShareDialog();
  };

  // ----------------------------------------------------------------------------------------------------------------------
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <Toast />
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
                  remainingCourses={remainingCourses}
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
                  <TimelineHeader
                    timelineName={state.timelineName}
                    addButtonText={state.addButtonText}
                    onAddSemester={() => setIsModalOpen(true)}
                  />

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
                          firstOccurrence={firstOccurrence}
                          coursePools={state.coursePools}
                          remainingCourses={remainingCourses}
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
                <CourseDescription
                  selectedCourse={state.selectedCourse}
                  showCourseDescription={state.showCourseDescription}
                  toggleCourseDescription={toggleCourseDescription}
                />
                <DragOverlay dropAnimation={null}>
                  {state.activeId ? <div className="course-item-overlay selected">{state.activeCourseCode}</div> : null}
                </DragOverlay>
              </div>
            </>
          )}
        </div>

        {/* ---------- Modal for Add Semester ---------- */}
        {state.isModalOpen && <AddSemesterModal onClose={setIsModalOpen} handleAddSemester={handleAddSemester} />}
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
          <ItemAddingModal
            title={'Add Deficiency Courses'}
            allCourses={state.allCourses}
            onClose={setShowDeficiencyModal}
            onAdd={addDeficiencyCourse}
          />
        )}
        {state.showExemptionsModal && (
          <ItemAddingModal
            title={'Add Exempted Courses'}
            allCourses={state.allCourses}
            onClose={setShowExemptionsModal}
            onAdd={addExemptionCourse}
          />
        )}
      </DndContext>
    </motion.div>
  );
};

export default TimelinePage;
