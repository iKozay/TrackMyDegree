import type { JSX } from "react";
import type { RequisiteGroup, CourseMap } from "../types/timeline.types"; // adjust path as needed

interface RequisiteGroupProps {
  title: string;
  groups?: RequisiteGroup[] | string;
  courses?: CourseMap;
}

export function RequisiteGroup({
  title,
  groups = [],
  courses = {},
}: RequisiteGroupProps): JSX.Element | null {
  if (!Array.isArray(groups) || groups.length === 0) {
    return null;
  }

  return (
    <div className="prerequisites">
      <h4>{title}</h4>

      <div className="prereq-list">
        {groups.map((group, gi) => {
          const options = Array.isArray(group.anyOf) ? group.anyOf : [];

          return (
            <div key={`pre-group-${gi}`}>
              {gi > 0 && <div className="and-sep">AND</div>}

              <div className="flex flex-wrap items-center gap-2">
                {options.map((prereqCode, oi) => {
                  const prereqCourse = courses[prereqCode];
                  const status = prereqCourse?.status?.status; // CourseStatusValue | undefined

                  return (
                    <div
                      key={`pre-${gi}-${oi}-${prereqCode}`}
                      className={`prereq-item status-${status ?? "unknown"}`}>
                      <span className="font-mono">{prereqCode}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
