import React from "react";
import type { AddedCourse } from "src/types/classItem";
import "../../styles/components/classbuilder/ScheduledCoursesStyle.css"

interface ScheduledCoursesProps {
    addedCourses: AddedCourse[];
    setAddedCourses: (courses: AddedCourse[]) => void;
}

const ScheduledCourses: React.FC<ScheduledCoursesProps> = ({ addedCourses, setAddedCourses }) => {

    const removeCourse = (code: string) => {
        setAddedCourses(addedCourses.filter((c) => c.code !== code));
    };

    return (
        <div className="scheduled-courses-card">

            <h2 className="scheduled-courses-card__title">Scheduled Courses</h2>

            <div className="scheduled-courses-card__list">
                {addedCourses.length === 0 ? (
                    <p className="scheduled-courses-card__empty">No courses added yet.</p>
                ) : (
                    addedCourses.map((course) => (
                        <div className="course-item" key={course.code}>
                            <button
                                className="course-item__delete"
                                onClick={() => removeCourse(course.code)}
                                aria-label={`Remove ${course.code}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true">
                                    <path d="M10 11v6"></path>
                                    <path d="M14 11v6"></path>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                    <path d="M3 6h18"></path>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                            <p className="course-item__name">{course.code}</p>
                            <p className="course-item__title">{course.title}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ScheduledCourses;