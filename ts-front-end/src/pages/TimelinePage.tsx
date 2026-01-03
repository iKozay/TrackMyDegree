import React from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import CoursePool from "../components/CoursePool";
import SemesterPlanner from "../components/SemesterPlanner";
import CourseDetails from "../components/CourseDetail";
import { TimelineHeader } from "../components/TimelineHeader";
import TimelineDndProvider from "../providers/timelineDndProvider";
import { useTimelineState } from "../hooks/useTimelineState";
import { TimelineLoader } from "../components/TimelineLoader";
import { TimelineError } from "../components/TimelineError";
import { MainModal } from "../components/MainModal";
import "../styles/timeline.css";
import { calculateEarnedCredits, saveTimeline } from "../utils/timelineUtils";
import { useAuth } from "../hooks/useAuth";

type TimeLinePageRouteParams = {
  jobId?: string;
};

const TimeLinePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { jobId } = useParams<TimeLinePageRouteParams>();
  const location = useLocation();

  const { status, state, actions, canUndo, canRedo } = useTimelineState(jobId);
  const navigate = useNavigate();

  const handleLogin = () => {
    localStorage.setItem("redirectAfterLogin", location.pathname);
    navigate("/signin", { replace: true });
  };

  // TO DISCUSS
  const tryAgain = () => {
    navigate(`/timeline/${jobId}`);
  };
  if (status === "processing") {
    return <TimelineLoader />;
  }

  if (status === "error") {
    return <TimelineError onRetry={tryAgain} />;
  }

  return (
    <TimelineDndProvider
      courses={state.courses}
      semesters={state.semesters}
      onMoveFromPoolToSemester={actions.moveFromPoolToSemester}
      onMoveBetweenSemesters={actions.moveBetweenSemesters}>
      <div className="app">
        {state.modal.open && (
          <MainModal
            open={state.modal.open}
            type={state.modal.type} // "insights" | "exemption"
            pools={state.pools}
            courses={state.courses}
            timelineName={state.timelineName}
            onSave={(timelineName: string) => {
              if (user) saveTimeline(user.id, timelineName, state);
            }}
            onAdd={actions.addCourse}
            onClose={actions.openModal}
          />
        )}
        <TimelineHeader
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={actions.undo}
          onRedo={actions.redo}
          earnedCredits={calculateEarnedCredits(state.courses)}
          totalCredits={state.degree.totalCredits}
          onOpenModal={actions.openModal}
          onSave={
            isAuthenticated
              ? (open: boolean, type: string) => actions.openModal(open, type)
              : handleLogin
          }
        />

        <main className="timeline-main">
          <aside className="sidebar-left">
            <CoursePool
              pools={state.pools}
              courses={state.courses}
              onCourseSelect={actions.selectCourse}
              selectedCourse={state.selectedCourse}
            />
          </aside>

          <section className="timeline-section">
            <SemesterPlanner
              semesters={state.semesters}
              courses={state.courses}
              onCourseSelect={actions.selectCourse}
              selectedCourse={state.selectedCourse}
              onAddSemester={actions.addSemester}
            />
          </section>

          <aside className="sidebar-right">
            <CourseDetails
              course={
                state.selectedCourse
                  ? state.courses[state.selectedCourse]
                  : null
              }
              courses={state.courses}
              onRemoveCourse={actions.removeFromSemester}
              onChangeCourseStatus={actions.changeCourseStatus}
            />
          </aside>
        </main>
      </div>
    </TimelineDndProvider>
  );
};

export default TimeLinePage;
