import React, { useState, useEffect } from "react";
import { api } from "../api/http-api-client";
import type { CourseCode } from "../types/timeline.types";
import "../styles/components/AddModal.css";

type AddModalProps = {
  type: "exemption" | "deficiency";
  onAdd: (courseId: CourseCode, type: string) => void;
};

export const AddModal: React.FC<AddModalProps> = ({ type, onAdd }) => {
  const [courses, setCourses] = useState<CourseCode[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseCode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses from the database
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<{ courseCodes: CourseCode[] }>(
          "/courses/all-codes",
        );
        setCourses(response.courseCodes);
        setFilteredCourses(response.courseCodes);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Filter courses based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const search = searchTerm.toLowerCase();
    const filtered = courses.filter((course) => {
      const code = course.toLowerCase();
      return code.includes(search);
    });

    setFilteredCourses(filtered);
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
        {loading && (
          <div className="add-modal-loading">
            <p>Loading courses...</p>
          </div>
        )}

        {error && (
          <div className="add-modal-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredCourses.length === 0 && (
          <div className="add-modal-no-results">
            <p>
              {searchTerm.trim()
                ? "No courses found matching your search."
                : "No courses available."}
            </p>
          </div>
        )}

        {!loading && !error && filteredCourses.length > 0 && (
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
