import React, { useMemo, useState } from "react";
import type { CourseCode, CourseMap } from "../types/timeline.types";
import { type CoursePoolData } from "@trackmydegree/shared";
import "../styles/components/AddModal.css";

/**
 * ManageModal replaces and extends deprecated AddModal
 * Modal to view, add, and remove courses from exemption/deficiency pools
 */
type CourseItemProps = {
  code: string;
  title?: string;
  actionClassName: string;
  actionLabel: string;
  actionTitle: string;
  onAction: () => void;
};

const CourseItem: React.FC<CourseItemProps> = ({
  code,
  title,
  actionClassName,
  actionLabel,
  actionTitle,
  onAction,
}) => (
  <div className="add-modal-course-info">
    <div className="add-modal-course-code">{code}</div>
    {title && <div className="add-modal-course-title">{title}</div>}
    <button className={actionClassName} onClick={onAction} title={actionTitle}>
      {actionLabel}
    </button>
  </div>
);

type ManageModalProps = {
  type: "exemption" | "deficiency";
  courses: CourseMap;
  pools: CoursePoolData[];
  onAdd: (courseId: CourseCode, type: string) => void;
  onRemove: (courseId: CourseCode, type: string) => void;
};

export const ManageModal: React.FC<ManageModalProps> = ({
  type,
  courses,
  pools,
  onAdd,
  onRemove,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const poolName = type === "exemption" ? "exemptions" : "deficiencies";

  const currentCourses = useMemo(() => {
    const pool = pools.find((p) => p._id.toLowerCase() === poolName);
    return pool?.courses ?? [];
  }, [pools, poolName]);

  const filteredCourses = useMemo(() => {
    const courseCodes = Object.keys(courses).filter(
      (code) => !currentCourses.includes(code),
    );

    if (!searchTerm.trim()) {
      return courseCodes;
    }

    const search = searchTerm.toLowerCase();
    return courseCodes.filter((course) =>
      course.toLowerCase().includes(search),
    );
  }, [searchTerm, courses, currentCourses]);

  const label = type === "exemption" ? "Exemption" : "Deficiency";
  const labelPlural = type === "exemption" ? "Exemptions" : "Deficiencies";

  return (
    <>
      <div className="add-modal-header">
        <h2 className="add-modal-title">Manage {labelPlural}</h2>
        <p className="add-modal-subtitle">
          View, add, or remove courses from your {labelPlural.toLowerCase()}
        </p>
      </div>

      {/* ---- Current courses in pool ---- */}
      <div className="manage-modal-section">
        <h3 className="manage-modal-section-title">
          Current {labelPlural}
          {currentCourses.length > 0 && (
            <span className="manage-modal-badge">{currentCourses.length}</span>
          )}
        </h3>

        {currentCourses.length === 0 ? (
          <div className="manage-modal-empty">
            <p>No {labelPlural.toLowerCase()} added yet.</p>
          </div>
        ) : (
          <div className="manage-modal-current-list">
            {currentCourses.map((code) => (
              <div key={code} className="manage-modal-current-item">
                <CourseItem
                  code={code}
                  title={courses[code]?.title}
                  actionClassName="manage-modal-remove-btn"
                  actionLabel="−"
                  actionTitle={`Remove ${code} from ${labelPlural.toLowerCase()}`}
                  onAction={() => onRemove(code, type)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="manage-modal-divider" />

      {/* ---- Available courses to add ---- */}
      <div className="manage-modal-section">
        <h3 className="manage-modal-section-title">Add {label}</h3>

        <div className="add-modal-search">
          <input
            type="text"
            placeholder="Search courses by code or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="add-modal-search-input"
          />
        </div>

        <div className="add-modal-body">
          {filteredCourses.length === 0 && (
            <div className="add-modal-no-results">
              <p>
                {searchTerm.trim()
                  ? "No courses found matching your search."
                  : "All courses have already been added."}
              </p>
            </div>
          )}

          {filteredCourses.length > 0 && (
            <div className="add-modal-courses">
              {filteredCourses.map((course) => (
                <div key={course} className="add-modal-course-item">
                  <CourseItem
                    code={course}
                    title={courses[course]?.title}
                    actionClassName="add-modal-add-btn"
                    actionLabel="+"
                    actionTitle={`Add ${course} to ${labelPlural.toLowerCase()}`}
                    onAction={() => onAdd(course, type)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
