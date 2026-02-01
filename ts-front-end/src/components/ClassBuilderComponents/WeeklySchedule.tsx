import React from "react";
import type { ClassItem } from "../../pages/ClassBuilderPage";

interface WeeklyScheduleProps {
  classes: ClassItem[];
}

const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ classes }) => {

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
        
        .schedule-title {
          color: #0f172a;
          margin-bottom: 16px;
          font-size: 1.25rem;
          font-weight: 600;
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

      <h2 className="schedule-title">Weekly Schedule</h2>
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
                {days.map((_, dayIndex) => {
                  const classItem = getClassForCell(dayIndex, hour);
                  return (
                    <td
                      key={dayIndex}
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