import React from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const { user } = useAuth();
  const { jobId } = useParams<TimeLinePageRouteParams>();

  const { status, state, actions, canUndo, canRedo, errorMessage } =
    useTimelineState(jobId);
  const navigate = useNavigate();

  // TO DISCUSS
  const tryAgain = () => {
    navigate("/timeline");
  };
  if (status === "processing") {
    return <TimelineLoader />;
  }

  if (status === "error") {
    return <TimelineError onRetry={tryAgain} message={errorMessage ?? undefined} />;
  }
  
  // Find the exemption pool, with fallback to empty pool
  const exemptionCoursePool = state.pools.find(pool => 
    pool._id.toLowerCase().includes("exemption")
  ) || { _id: "exemption", name: "Exemption", creditsRequired: 0, courses: [] };
  const deficiencyCoursePool = state.pools.find(pool => 
    pool._id.toLowerCase().includes("deficiency")
  ) || { _id: "deficiency", name: "Deficiency", creditsRequired: 0, courses: [] };
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
              if (user) saveTimeline(user.id, timelineName, jobId);
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
          earnedCredits={calculateEarnedCredits(state.courses, exemptionCoursePool)}
          totalCredits={state.degree.totalCredits + deficiencyCoursePool.creditsRequired}
          onOpenModal={actions.openModal}
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
