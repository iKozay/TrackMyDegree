import React from "react";
import type { AddedCourse } from "src/types/classItem";

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
            <style>{`
                .scheduled-courses-card {
                    background-color: var(--card);
                    color: var(--card-foreground);
                    display: flex;
                    flex-direction: column;
                    border-radius: calc(var(--radius) + 4px);
                    border: 1px solid var(--border);
                    padding: 1.5rem;
                }

                .scheduled-courses-card__title {
                    color: var(--color-slate-900);
                    margin-bottom: 1rem;
                }

                .scheduled-courses-card__list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    max-height: 24rem;
                    overflow-y: auto;
                    padding-right: 0.25rem;
                }

                .scheduled-courses-card__list::-webkit-scrollbar {
                    width: 6px;
                }

                .scheduled-courses-card__list::-webkit-scrollbar-track {
                    background: transparent;
                }

                .scheduled-courses-card__list::-webkit-scrollbar-thumb {
                    background-color: var(--color-slate-200);
                    border-radius: 3px;
                }

                .scheduled-courses-card__list::-webkit-scrollbar-thumb:hover {
                    background-color: var(--color-slate-300);
                }

                .scheduled-courses-card__empty {
                    font-size: 0.875rem;
                    color: var(--color-slate-400);
                    text-align: center;
                    padding: 1.5rem 0;
                }

                .course-item {
                    position: relative;
                    padding: 0.75rem;
                    padding-right: 2.75rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--color-slate-200);
                    background-color: var(--color-slate-50);
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }

                .course-item:hover {
                    border-color: var(--color-rose-200);
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
                }

                .course-item__name {
                    color: var(--color-slate-900);
                    font-weight: var(--font-weight-medium);
                    font-size: 1rem;
                    margin: 0 0 0.2rem 0;
                }

                .course-item__title {
                    font-size: 0.75rem;
                    color: var(--color-slate-500);
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: calc(100% - 1rem);
                }

                .course-item__delete {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.25rem;
                    height: 2.25rem;
                    padding: 0;
                    border: none;
                    border-radius: calc(var(--radius) - 2px);
                    background: transparent;
                    cursor: pointer;
                    transition: background-color 0.15s ease;
                    flex-shrink: 0;
                    opacity: 0.5;
                }

                .course-item:hover .course-item__delete {
                    opacity: 1;
                }

                .course-item__delete:hover {
                    background-color: var(--color-red-50);
                }

                .course-item__delete svg {
                    width: 1.125rem;
                    height: 1.125rem;
                    color: var(--color-red-600);
                }
            `}</style>

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