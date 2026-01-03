import React from "react";
import "../styles/components/CourseTooltip.css";

type CourseTooltipProps = {
    section: "completed" | "remaining";
    takenCourses: string[];
    remainingCourses: string[];
    creditsTaken: number;
    creditsRequired: number;
    onClose: () => void;
};

export const CourseTooltip: React.FC<CourseTooltipProps> = ({
    section,
    takenCourses,
    remainingCourses,
    creditsTaken,
    creditsRequired,
    onClose,
}) => {
    const isCompleted = section === "completed";
    const coursesToShow = isCompleted ? takenCourses : remainingCourses.slice(0, 20);
    const credits = isCompleted ? creditsTaken : creditsRequired - creditsTaken;

    return (
        <div className="insights-course-tooltip" onMouseEnter={(e) => e.stopPropagation()}>
            <button className="insights-course-tooltip-close-button" onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}>
                ✕
            </button>
            <h4 className="insights-course-tooltip-title">
                {isCompleted ? `Completed: ${credits} credits` : `Remaining: ${credits} credits`}
            </h4>
            <p className="insights-course-tooltip-courses-label">Courses:</p>
            <ul className="insights-course-tooltip-courses-list">
                {coursesToShow.map((courseId) => (
                    <li key={courseId} className="insights-course-tooltip-course-item">
                        {courseId}
                    </li>
                ))}
            </ul>
            {!isCompleted && remainingCourses.length > 20 && (
                <p className="insights-course-tooltip-more-text">
                    +{remainingCourses.length - 20} more
                </p>
            )}
        </div>
    );
};