import React from "react";
import type { ClassItem } from "../../pages/ClassBuilderPage";

interface ScheduledCoursesProps {
    classes: ClassItem[];
    setClasses: (classes: ClassItem[]) => void;
}

interface CourseGroup {
    name: string;
    section: string;
    room: string;
    days: number[];
    startTime: number;
    endTime: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTime = (hour: number): string => {
    return `${hour.toString().padStart(2, "0")}:00`;
};

const groupCourses = (classes: ClassItem[]): CourseGroup[] => {
    const map = new Map<string, CourseGroup>();
    classes.forEach(c => {
        const key = `${c.name}|${c.section}|${c.room}|${c.startTime}|${c.endTime}`;
        const existing = map.get(key);
        if (existing) {
            existing.days.push(c.day);
        } else {
            map.set(key, {
                name: c.name,
                section: c.section,
                room: c.room,
                days: [c.day],
                startTime: c.startTime,
                endTime: c.endTime,
            });
        }
    });
    return Array.from(map.values());
};

const ScheduledCourses: React.FC<ScheduledCoursesProps> = ({ classes, setClasses }) => {
    const courses = groupCourses(classes);

    const removeCourse = (course: CourseGroup) => {
        setClasses(classes.filter(c =>
            !(c.name === course.name && c.section === course.section && c.room === course.room
                && c.startTime === course.startTime && c.endTime === course.endTime)
        ));
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

                .course-item__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 0.5rem;
                    gap: 0.5rem;
                }

                .course-item__name {
                    color: var(--color-slate-900);
                    font-weight: var(--font-weight-medium);
                    font-size: 1rem;
                    white-space: nowrap;
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

                .course-item__details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }

                .course-item__row {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: var(--color-slate-500);
                }

                .course-item__row svg {
                    width: 0.75rem;
                    height: 0.75rem;
                    flex-shrink: 0;
                    color: var(--color-slate-400);
                }
            `}</style>

            <h2 className="scheduled-courses-card__title">Scheduled Courses</h2>
            <div className="scheduled-courses-card__list">
                {courses.map((course) => (
                    <div className="course-item">
                        <button className="course-item__delete" onClick={() => removeCourse(course)} aria-label={`Remove ${course.name}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                aria-hidden="true">
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                <path d="M3 6h18"></path>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>

                        <div className="course-item__details">
                            <p className="course-item__name">{course.name}</p>

                            <div className="course-item__row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                    aria-hidden="true">
                                    <path d="M12 6v6l4 2"></path>
                                    <circle cx="12" cy="12" r="10"></circle>
                                </svg>
                                <span>{course.section}</span>
                            </div>
                            <div className="course-item__row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                    aria-hidden="true">
                                    <path d="M12 6v6l4 2"></path>
                                    <circle cx="12" cy="12" r="10"></circle>
                                </svg>
                                <span>{course.days.map(d => DAY_NAMES[d]).join(", ")} {formatTime(course.startTime)}-{formatTime(course.endTime)}</span>
                            </div>

                            <div className="course-item__row">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                                    aria-hidden="true">
                                    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                                    <circle cx="12" cy="10" r="3"></circle>
                                </svg>
                                <span>{course.room}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScheduledCourses;