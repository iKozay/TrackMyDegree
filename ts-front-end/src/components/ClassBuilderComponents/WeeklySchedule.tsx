import React from "react";
import type { ClassItem } from "src/types/classItem";

interface WeeklyScheduleProps {
  classes: ClassItem[];
  pinnedClassNumbers: Set<string>;
  configIndex: number;
  totalConfigs: number;
  onPrev: () => void;
  onNext: () => void;
  onTogglePin: (classNumber: string) => void;
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  classes,
  pinnedClassNumbers,
  configIndex,
  totalConfigs,
  onPrev,
  onNext,
  onTogglePin,
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
                    transition: background-color 0.15s ease, border-color 0.15s ease;
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
                    padding: 0;
                    height: 60px;
                    min-width: 100px;
                    max-height: 60px;
                    overflow: hidden;
                }

                .schedule-table th {
                    background: #f8fafc;
                    font-weight: 500;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    padding: 8px;
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

                /* Default (unpinned) class cell — rose */
                .class-cell {
                    background: #ffe4e6;
                    position: relative;
                    cursor: pointer;
                    transition: background-color 0.15s ease, filter 0.15s ease;
                }

                .class-cell:hover {
                    filter: brightness(0.95);
                }

                /* Pinned class cell — green, matching rose's saturation/contrast */
                .class-cell--pinned {
                    background: #dcfce7;
                }

                .class-info {
                    position: absolute;
                    inset: 0;
                    padding: 6px 8px;
                    font-size: 0.75rem;
                    pointer-events: none;
                    overflow: hidden;
                }

                /* Unpinned text colours */
                .class-name {
                    color: #881337;
                    font-weight: 500;
                    margin: 0;
                }

                .class-section {
                    color: #be123c;
                    margin: 0;
                }

                .class-room {
                    color: #e11d48;
                    margin: 0;
                }

                /* Pinned text colours — green equivalents */
                .class-cell--pinned .class-name {
                    color: #14532d;
                }

                .class-cell--pinned .class-section {
                    color: #166534;
                }

                .class-cell--pinned .class-room {
                    color: #16a34a;
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
                  const isPinned = classItem
                    ? pinnedClassNumbers.has(classItem.classNumber)
                    : false;

                  return (
                    <td
                      key={`${day}-${hour}`}
                      className={
                        classItem
                          ? `class-cell${isPinned ? " class-cell--pinned" : ""}`
                          : "empty-cell"
                      }
                      onClick={() => classItem && onTogglePin(classItem.classNumber)}
                      title={classItem ? (isPinned ? "Click to unpin" : "Click to pin") : undefined}
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