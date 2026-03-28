import React, { useMemo, useState } from "react";
import type { CourseCode, CourseMap } from "../types/timeline.types";
import "../styles/components/AddModal.css";

type AddModalProps = {
  type: "exemption" | "deficiency";
  courses: CourseMap;
  onAdd: (courseId: CourseCode, type: string) => void;
};

export const AddModal: React.FC<AddModalProps> = ({ type, courses, onAdd }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCourses = useMemo(() => {
    const courseCodes = Object.keys(courses);

    if (!searchTerm.trim()) {
      return courseCodes;
    }

    const search = searchTerm.toLowerCase();
    return courseCodes.filter((course) => {
      const code = course.toLowerCase();
      return code.includes(search);
    });
  }, [searchTerm, courses]);

  const handleAddCourse = (course: CourseCode) => {
    onAdd(course, type);
  };

  return (
    <>
      <div className="add-modal-header">
        <h2 className="add-modal-title">{type} - Add Course</h2>
        <p className="add-modal-subtitle">
          Select a course to add to your {type}s
        </p>
      </div>

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
                : "No courses available."}
            </p>
          </div>
        )}

        {filteredCourses.length > 0 && (
          <div className="add-modal-courses">
            {filteredCourses.map((course) => (
              <div key={course} className="add-modal-course-item">
                <div className="add-modal-course-info">
                  <div className="add-modal-course-code">{course}</div>
                </div>
                <button
                  className="add-modal-add-btn"
                  onClick={() => handleAddCourse(course)}
                  title={`Add ${course} to ${type}s`}>
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
