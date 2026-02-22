import React from "react";
import type { ClassItem } from "src/types/classItem";

interface WeeklyScheduleProps {
  classes: ClassItem[];
  configIndex: number;
  totalConfigs: number;
  onPrev: () => void;
  onNext: () => void;
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  classes,
  configIndex,
  totalConfigs,
  onPrev,
  onNext,
}) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8 to 22

  const getClassForCell = (day: number, hour: number) => {
    return classes.find(
      (c) => c.day === day && hour >= c.startTime && hour < c.endTime
    );
  };

  const isFirstHourOfClass = (classItem: ClassItem, hour: number) => {
    return hour === classItem.startTime;
  };

  const hasMultipleConfigs = totalConfigs > 1;

  return (
    <div className="schedule-container">
      <style>{`
                .schedule-container {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .schedule-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0;
                }

                .schedule-title {
                    color: #0f172a;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 0;
                }

                .schedule-nav {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .schedule-nav__counter {
                    font-size: 0.875rem;
                    color: #64748b;
                    min-width: 5rem;
                    text-align: center;
                    font-variant-numeric: tabular-nums;
                }

                .schedule-nav__button {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    border-radius: 6px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    color: #374151;
                    cursor: pointer;
                    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
                    flex-shrink: 0;
                }

                .schedule-nav__button:hover:not(:disabled) {
                    background-color: #f1f5f9;
                    border-color: #cbd5e1;
                }

                .schedule-nav__button:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }

                .schedule-nav__button svg {
                    width: 1rem;
                    height: 1rem;
                }

                .schedule-scroll {
                    overflow: auto;
                    max-height: 600px;
                }

                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 800px;
                }

                .schedule-table th,
                .schedule-table td {
                    border: 1px solid #e2e8f0;
                    padding: 8px;
                    height: 60px;
                    min-width: 100px;
                }

                .schedule-table th {
                    background: #f8fafc;
                    font-weight: 500;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }

                .time-column {
                    background: #f8fafc;
                    color: #64748b;
                    text-align: center;
                    font-size: 0.875rem;
                    width: 80px;
                    min-width: 80px;
                    position: sticky;
                    left: 0;
                    z-index: 5;
                }

                .time-column-header {
                    position: sticky;
                    left: 0;
                    z-index: 15;
                    background: #f8fafc;
                }

                .day-header {
                    color: #0f172a;
                }

                .empty-cell {
                    background: white;
                }

                .class-cell {
                    background: #ffe4e6;
                    position: relative;
                }

                .class-info {
                    font-size: 0.75rem;
                }

                .class-name {
                    color: #881337;
                    font-weight: 500;
                }

                .class-section {
                    color: #be123c;
                }

                .class-room {
                    color: #e11d48;
                }
            `}</style>

      <div className="schedule-header">
        <h2 className="schedule-title">Weekly Schedule</h2>

        {hasMultipleConfigs && (
          <nav className="schedule-nav" aria-label="Configuration navigation">
            <button
              className="schedule-nav__button"
              onClick={onPrev}
              disabled={configIndex === 0}
              aria-label="Previous configuration"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <span className="schedule-nav__counter">
              {configIndex + 1} / {totalConfigs}
            </span>

            <button
              className="schedule-nav__button"
              onClick={onNext}
              disabled={configIndex === totalConfigs - 1}
              aria-label="Next configuration"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </nav>
        )}
      </div>

      <div className="schedule-scroll">
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="time-column time-column-header">Time</th>
              {days.map((day) => (
                <th key={day} className="day-header">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr key={hour}>
                <td className="time-column">{hour}:00</td>
                {days.map((day, dayIndex) => {
                  const classItem = getClassForCell(dayIndex, hour);
                  return (
                    <td
                      key={`${day}-${hour}`}
                      className={classItem ? "class-cell" : "empty-cell"}
                    >
                      {classItem && isFirstHourOfClass(classItem, hour) && (
                        <div className="class-info">
                          <p className="class-name">{classItem.name}</p>
                          <p className="class-section">{classItem.section}</p>
                          <p className="class-room">{classItem.room}</p>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklySchedule;