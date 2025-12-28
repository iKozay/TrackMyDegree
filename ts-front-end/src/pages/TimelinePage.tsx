import React from "react";
import { useParams } from "react-router-dom";
import CoursePool from "../components/CoursePool";
import SemesterPlanner from "../components/SemesterPlanner";
import CourseDetails from "../components/CourseDetail";
import { TimelineHeader } from "../components/TimelineHeader";
import TimelineDndProvider from "../providers/timelineDndProvider";
import { useTimelineState } from "../hooks/useTimelineState";
import { TimelineLoader } from "../components/TimelineLoader";
import { TimelineError } from "../components/TimelineError";
import { useNavigate } from "react-router-dom";
import { MainModal } from "../components/MainModal";
import "../styles/timeline.css";

type TimeLinePageRouteParams = {
  jobId?: string;
};

const TimeLinePage: React.FC = () => {
  const { jobId } = useParams<TimeLinePageRouteParams>();

  const { status, state, actions, canUndo, canRedo } = useTimelineState(jobId);
  const navigate = useNavigate();

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
      onMoveFromPoolToSemester={actions.moveFromPoolToSemester}
      onMoveBetweenSemesters={actions.moveBetweenSemesters}>
      <div className="app">
        {state.modal.open && (
          <MainModal
            open={state.modal.open}
            type={state.modal.type} // "insights" | "exemption"
            onClose={actions.openModal}
          />
        )}
        <TimelineHeader
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={actions.undo}
          onRedo={actions.redo}
          earnedCredits={0} // later: compute from courses
          totalCredits={120} // from degree.totalCredits
          onShowInsights={actions.openModal}
          onSave={() => {
            // TODO: trigger save actions.saveTimeline
          }}
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
              onRemoveCourse={actions.removeFromSemester}
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
            />
          </aside>
        </main>
      </div>
    </TimelineDndProvider>
  );
};

export default TimeLinePage;
