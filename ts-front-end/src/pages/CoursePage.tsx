import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useDegrees from "../legacy/hooks/useDegree.jsx";
import useCourses from "../legacy/hooks/useCourses.jsx";
import useResponsive from "../legacy/hooks/useResponsive.jsx";
import CourseSectionButton from "../legacy/components/SectionModal.jsx";
import type { CourseData } from "@trackmydegree/shared";
import "../styles/CoursePage.css";

// Icons as inline SVG components for consistency
const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const GraduationCapIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CreditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M6 12h12" />
  </svg>
);

export interface CourseGroup {
  name: string;
  poolId?: string;
  poolName?: string;
  creditsRequired?: number;
  courses: CourseData[];
  subcourses?: CourseGroup[];
  subcourseTitle?: string;
  subcourseCredits?: number;
}

interface Degree {
  _id: string;
  name: string;
}

const CourseTitleBlock: React.FC<{
  course: CourseData;
}> = ({ course }) => (
  <>
    <h2 className="details-header-code">{course._id}</h2>
    <p className="details-header-title">{course.title}</p>
  </>
);

const CourseDetailsContent: React.FC<{
  course: CourseData;
}> = ({ course }) => (
  <>
    <div className="details-section">
      <h4 className="details-section-title">
        <CreditIcon /> Credits
      </h4>
      <div className="details-section-content">
        <span className="credits-badge">{course.credits} Credits</span>
      </div>
    </div>

    <div className="details-section">
      <h4 className="details-section-title">Prerequisites & Corequisites</h4>
      <div className="details-section-content">
        {course.prereqCoreqText ? (
          <div className="requisites-list">
            <span className="requisite-codes">{course.prereqCoreqText}</span>
          </div>
        ) : (
          <p style={{ color: "#64748b", fontStyle: "italic" }}>
            No prerequisites or corequisites required
          </p>
        )}
      </div>
    </div>

    <div className="details-section">
      <h4 className="details-section-title">Description</h4>
      <div className="details-section-content">
        {course.description || "No description available."}
      </div>
    </div>

    {course.components && course.components.length > 0 && (
      <div className="details-section">
        <h4 className="details-section-title">Components</h4>
        <div className="details-section-content">
          <div className="components-list">
            {course.components.map((component) => (
              <span key={component} className="component-badge">{component}</span>
            ))}
          </div>
        </div>
      </div>
    )}

    {course.notes && (
      <div className="details-section">
        <h4 className="details-section-title">Notes</h4>
        <div className="details-section-content">{course.notes}</div>
      </div>
    )}

    <CourseSectionButton code={course._id} title={course.title} hidden={true} />
  </>
);

// Course Card Component
const CourseCard: React.FC<{
  course: CourseData;
  isSelected: boolean;
  onClick: () => void;
}> = ({ course, isSelected, onClick }) => {
  const formatCode = (id: string) => {
    return `${id.slice(0, 4)} ${id.slice(4)}`;
  };

  return (
    <motion.div
      className={`course-card-item ${isSelected ? "selected" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <div className="course-card-code">
        {formatCode(course._id)}
        <span className="course-card-credits">{course.credits} cr</span>
      </div>
      <p className="course-card-title">{course.title}</p>
    </motion.div>
  );
};

const COURSES_PAGE_SIZE = 100;

// Pool Accordion Component
const PoolAccordion: React.FC<{
  group: CourseGroup;
  selectedCourse: CourseData | null;
  onCourseSelect: (course: CourseData) => void;
  defaultExpanded?: boolean;
}> = ({ group, selectedCourse, onCourseSelect, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [visibleCount, setVisibleCount] = useState(COURSES_PAGE_SIZE);
  const [prevCourses, setPrevCourses] = useState(group.courses);

  // Reset pagination when the course list changes (new degree or search term)
  if (group.courses !== prevCourses) {
    setPrevCourses(group.courses);
    setVisibleCount(COURSES_PAGE_SIZE);
  }

  const visibleCourses = group.courses.slice(0, visibleCount);
  const hiddenCount = group.courses.length - visibleCount;

  return (
    <div className="pool-section">
      <button
        className={`pool-header-btn ${isExpanded ? "expanded" : ""}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="pool-chevron">
          <ChevronDownIcon />
        </span>
        <span className="pool-name">{group.name || group.poolName}</span>
        <span className="pool-course-count">{group.courses.length} courses</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div className="pool-courses-container">
              <div className="course-grid">
                {visibleCourses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    isSelected={selectedCourse?._id === course._id}
                    onClick={() => onCourseSelect(course)}
                  />
                ))}
              </div>

              {hiddenCount > 0 && (
                <button
                  className="show-more-courses-btn"
                  onClick={() => setVisibleCount((c) => c + COURSES_PAGE_SIZE)}
                >
                  Show {Math.min(hiddenCount, COURSES_PAGE_SIZE)} more courses
                  <span className="show-more-remaining">({hiddenCount} remaining)</span>
                </button>
              )}

              {/* Subcourses */}
              {group.subcourses && group.subcourses.length > 0 && (
                <div className="subcourse-wrapper">
                  <h4 className="subcourse-header">
                    {group.subcourseTitle}{" "}
                    <span>(Minimum of {group.subcourseCredits} credits)</span>
                  </h4>
                  {group.subcourses.map((subgroup, idx) => (
                    <PoolAccordion
                      key={subgroup.name || idx}
                      group={subgroup}
                      selectedCourse={selectedCourse}
                      onCourseSelect={onCourseSelect}
                      defaultExpanded={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Course Details Panel Component
const CourseDetailsPanel: React.FC<{
  course: CourseData | null;
}> = ({ course }) => {
  if (!course) {
    return (
      <div className="course-details-panel">
        <div className="empty-details-state">
          <div className="empty-details-icon">
            <BookOpenIcon />
          </div>
          <h3 className="empty-details-title">Select a Course</h3>
          <p className="empty-details-text">
            Click on any course card to view its details here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="course-details-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      key={course._id}
    >
      <div className="course-details-header">
        <CourseTitleBlock course={course} />
      </div>

      <div className="course-details-body">
        <CourseDetailsContent course={course} />
      </div>
    </motion.div>
  );
};

// Mobile Course Modal Component
const CourseModal: React.FC<{
  course: CourseData | null;
  onClose: () => void;
}> = ({ course, onClose }) => {
  if (!course) return null;

  return (
    <motion.div
      className="course-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="course-modal-content"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="course-modal-header">
          <div>
            <CourseTitleBlock course={course} />
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="course-modal-body">
          <CourseDetailsContent course={course} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main CoursePage Component
const CoursePage: React.FC = () => {
  const [selectedDegree, setSelectedDegree] = useState<string>("Select Degree");
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Custom hooks
  const { degrees } = useDegrees();
  const { courseList, fetchCoursesByDegree, fetchAllCourses, loading } = useCourses();
  const { isDesktop } = useResponsive();

  // Handle degree selection
  const handleSelectDegree = (degree: Degree) => {
    setSelectedDegree(degree.name);
    setShowDropdown(false);
    fetchCoursesByDegree(degree._id);
    setSelectedCourse(null);
  };

  // Handle "All Courses" selection
  const handleSelectAllCourses = () => {
    setSelectedDegree("All Courses");
    setShowDropdown(false);
    fetchAllCourses();
    setSelectedCourse(null);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedCourse(null);
  };

  // Filter courses based on search term
  const normalize = (value: string = "") =>
    String(value).toLowerCase().replaceAll(/\s+/g, "");
  
  const filteredCourseList = useMemo(() => {
    return courseList
      .map((group: CourseGroup) => ({
        ...group,
        courses: group.courses.filter((course: CourseData) =>
          normalize(course._id).includes(normalize(searchTerm))
        ),
      }))
      .filter((group: CourseGroup) => group.courses.length > 0);
  }, [courseList, searchTerm]);

  // Total course count
  const totalCourses = useMemo(() => {
    return filteredCourseList.reduce(
      (acc: number, group: CourseGroup) => acc + group.courses.length,
      0
    );
  }, [filteredCourseList]);

  const noResultsText = searchTerm
    ? `No courses match "${searchTerm}". Try a different search term.`
    : "No courses available for this selection.";

  const courseSuffix = totalCourses === 1 ? "" : "s";

  const renderCourseList = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p className="loading-text">Loading courses...</p>
        </div>
      );
    }
    if (selectedDegree === "Select Degree") {
      return (
        <div className="empty-courses-state">
          <div className="empty-courses-icon">
            <GraduationCapIcon />
          </div>
          <h3 className="empty-courses-title">Select a Degree</h3>
          <p className="empty-courses-text">
            Choose a degree program from the dropdown above to browse its courses, or select &quot;All Courses&quot; to see everything.
          </p>
        </div>
      );
    }
    if (filteredCourseList.length === 0) {
      return (
        <div className="empty-courses-state">
          <div className="empty-courses-icon">
            <SearchIcon />
          </div>
          <h3 className="empty-courses-title">No Courses Found</h3>
          <p className="empty-courses-text">{noResultsText}</p>
        </div>
      );
    }
    return (
      <>
        {searchTerm && (
          <div className="results-count">
            Found <strong>{totalCourses}</strong> course{courseSuffix} matching &quot;{searchTerm}&quot;
          </div>
        )}
        <div className="course-pool-accordion">
          {filteredCourseList.map((group: CourseGroup, idx: number) => (
            <PoolAccordion
              key={group.name || group.poolName || idx}
              group={group}
              selectedCourse={selectedCourse}
              onCourseSelect={setSelectedCourse}
              defaultExpanded={false}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <motion.div
      className="course-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="course-page-header">
        <span className="course-page-label">Course Browser</span>
        <h1 className="course-page-title">Explore Courses</h1>
        <p className="course-page-subtitle">
          Browse and discover courses across all GCSE Concordia programs. Select a degree to see available courses.
        </p>
      </header>

      {/* Controls */}
      <div className="course-controls">
        {/* Degree Selector */}
        <div className="degree-selector-wrapper">
          <button
            className={`degree-selector-btn ${showDropdown ? "open" : ""}`}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <span>{selectedDegree}</span>
            <span className="degree-selector-icon">
              <ChevronDownIcon />
            </span>
          </button>

          {showDropdown && (
            <div className="degree-dropdown">
              <button
                className="degree-dropdown-item all-courses"
                onClick={handleSelectAllCourses}
              >
                All Courses
              </button>
              {degrees.length === 0 ? (
                <div className="degree-dropdown-item" style={{ opacity: 0.5 }}>
                  Loading degrees...
                </div>
              ) : (
                degrees.map((degree: Degree) => (
                  <button
                    key={degree._id}
                    className="degree-dropdown-item"
                    onClick={() => handleSelectDegree(degree)}
                  >
                    {degree.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        {selectedDegree !== "Select Degree" && (
          <div className="search-wrapper">
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search courses (e.g., ENCS 282)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="course-main-content">
        {/* Course List */}
        <div className="course-list-section">
          {renderCourseList()}
        </div>

        {/* Course Details Panel (Desktop) */}
        {isDesktop && <CourseDetailsPanel course={selectedCourse} />}
      </div>

      {/* Mobile Modal */}
      <AnimatePresence>
        {!isDesktop && selectedCourse && (
          <CourseModal course={selectedCourse} onClose={handleCloseModal} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CoursePage;
