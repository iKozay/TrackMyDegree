import React, { useMemo } from "react";
import type { ClassItem } from "src/types/classItem";

interface ScheduleStatsProps {
    classes: ClassItem[];
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({ classes }) => {
    const totalHours = useMemo(() => {
        return classes.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
    }, [classes]);

    const uniqueCourses = useMemo(() => {
        const seen = new Set<string>();
        classes.forEach(c => seen.add(c.name));
        return seen.size;
    }, [classes]);

    return (
        <div className="stats-grid">
            <style>{`
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .stat-card {
                    background-color: var(--card);
                    color: var(--card-foreground);
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    border-radius: calc(var(--radius) + 4px);
                    border: 1px solid var(--border);
                    padding: 1.5rem;
                }

                .stat-card__header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }

                .stat-card__icon {
                    width: 1.25rem;
                    height: 1.25rem;
                }

                .stat-card__icon--hours { color: var(--color-rose-800); }
                .stat-card__icon--courses { color: var(--color-green-600); }

                .stat-card__label { color: var(--color-slate-600); }
                .stat-card__value { color: var(--color-slate-900); }
            `}</style>

            <div className="stat-card">
                <div className="stat-card__header">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="lucide lucide-clock stat-card__icon stat-card__icon--hours" aria-hidden="true">
                        <path d="M12 6v6l4 2"></path>
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                    <span className="stat-card__label">Total Hours</span>
                </div>
                <p className="stat-card__value">{totalHours} hours/week</p>
            </div>

            <div className="stat-card">
                <div className="stat-card__header">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className="lucide lucide-users stat-card__icon stat-card__icon--courses" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                        <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                    </svg>
                    <span className="stat-card__label">Enrolled Courses</span>
                </div>
                <p className="stat-card__value">{uniqueCourses} {uniqueCourses === 1 ? "course" : "courses"}</p>
            </div>
        </div>
    );
};

export default ScheduleStats;