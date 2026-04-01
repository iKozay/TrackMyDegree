import React, { useMemo, useState } from "react";
import type { CourseCode, CourseMap } from "../types/timeline.types";
import { type CoursePoolData } from "@trackmydegree/shared";
import "../styles/components/AddModal.css";

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
            {currentCourses.map((code) => {
              const course = courses[code];
              return (
                <div key={code} className="manage-modal-current-item">
                  <div className="add-modal-course-info">
                    <div className="add-modal-course-code">{code}</div>
                    {course?.title && (
                      <div className="add-modal-course-title">{course.title}</div>
                    )}
                  </div>
                  <button
                    className="manage-modal-remove-btn"
                    onClick={() => onRemove(code, type)}
                    title={`Remove ${code} from ${labelPlural.toLowerCase()}`}>
                    −
                  </button>
                </div>
              );
            })}
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
                  <div className="add-modal-course-info">
                    <div className="add-modal-course-code">{course}</div>
                    {courses[course]?.title && (
                      <div className="add-modal-course-title">
                        {courses[course].title}
                      </div>
                    )}
                  </div>
                  <button
                    className="add-modal-add-btn"
                    onClick={() => onAdd(course, type)}
                    title={`Add ${course} to ${labelPlural.toLowerCase()}`}>
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
