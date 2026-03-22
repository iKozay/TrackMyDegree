import React from "react";
import type { ClassItem } from "src/types/classItem";
import "../../styles/components/classbuilder/WeeklyScheduleSyle.css"

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

                  let cellClassName = "empty-cell";
                  let cellTitle;

                  if (classItem) {
                    cellClassName = "class-cell";

                    if (isPinned) {
                      cellClassName += " class-cell--pinned";
                      cellTitle = "Click to unpin";
                    } else {
                      cellTitle = "Click to pin";
                    }
                  }
                  return (
                    <td
                      key={`${day}-${hour}`}
                      className={cellClassName}
                      onClick={() => classItem && onTogglePin(classItem.classNumber)}
                      title={cellTitle}
                    >
                      {classItem && isFirstHourOfClass(classItem, hour) && (
                        <div className="class-info">
                          <p className="class-name">{classItem.name}</p>
                          <p className="class-section">{classItem.type}</p>
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