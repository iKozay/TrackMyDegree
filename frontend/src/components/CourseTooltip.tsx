import React from "react";
import "../styles/components/CourseTooltip.css";

type CourseTooltipProps = {
  takenCourses: string[];
  remainingCourses: string[];
  creditsTaken: number;
  creditsRequired: number;
  onClose: () => void;
};

const LIST_CAP = 20;

export const CourseTooltip: React.FC<CourseTooltipProps> = ({
  takenCourses,
  remainingCourses,
  creditsTaken,
  creditsRequired,
  onClose,
}) => {
  const remainingCredits = Math.max(0, creditsRequired - creditsTaken);
  const shownTaken = takenCourses.slice(0, LIST_CAP);
  const shownRemaining = remainingCourses.slice(0, LIST_CAP);

  return (
    <section
      className="insights-course-tooltip"
      aria-label="Pool progress: completed and remaining courses">
      <button
        type="button"
        className="insights-course-tooltip-close-button"
        aria-label="Close details"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}>
        ✕
      </button>

      <p className="insights-course-tooltip-summary">
        <strong>{creditsTaken}</strong> / {creditsRequired} credits in this pool
      </p>

      <div className="insights-course-tooltip-section insights-course-tooltip-section--completed">
        <h4 className="insights-course-tooltip-section-title">
          <span className="insights-course-tooltip-dot" aria-hidden />
          Completed ({creditsTaken} cr.)
        </h4>
        {takenCourses.length === 0 ? (
          <p className="insights-course-tooltip-empty">No completed courses in this pool yet.</p>
        ) : (
          <>
            <ul className="insights-course-tooltip-courses-list">
              {shownTaken.map((courseId) => (
                <li
                  key={courseId}
                  className="insights-course-tooltip-course-item insights-course-tooltip-course-item--completed">
                  {courseId}
                </li>
              ))}
            </ul>
            {takenCourses.length > LIST_CAP && (
              <p className="insights-course-tooltip-more-text">
                +{takenCourses.length - LIST_CAP} more completed
              </p>
            )}
          </>
        )}
      </div>

      <div className="insights-course-tooltip-section insights-course-tooltip-section--remaining">
        <h4 className="insights-course-tooltip-section-title">
          <span
            className="insights-course-tooltip-dot insights-course-tooltip-dot--remaining"
            aria-hidden
          />
          Remaining ({remainingCredits} cr.)
        </h4>
        {remainingCourses.length === 0 ? (
          <p className="insights-course-tooltip-empty">All required courses in this pool are planned or done.</p>
        ) : (
          <>
            <ul className="insights-course-tooltip-courses-list">
              {shownRemaining.map((courseId) => (
                <li
                  key={courseId}
                  className="insights-course-tooltip-course-item insights-course-tooltip-course-item--remaining">
                  {courseId}
                </li>
              ))}
            </ul>
            {remainingCourses.length > LIST_CAP && (
              <p className="insights-course-tooltip-more-text">
                +{remainingCourses.length - LIST_CAP} more remaining
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
};
