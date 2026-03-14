import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useDegrees from "../legacy/hooks/useDegree.jsx";
import useCourses from "../legacy/hooks/useCourses.jsx";
import useResponsive from "../legacy/hooks/useResponsive.jsx";
import { groupPrerequisites } from "../legacy/utils/groupPrerequisites.jsx";
import CourseSectionButton from "../legacy/components/SectionModal.jsx";
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

// Types
interface Course {
  _id: string;
  title: string;
  credits: number;
  description?: string;
  components?: string;
  notes?: string;
  requisites?: Array<{
    type: string;
    code1?: string;
    code2: string;
    group_id?: string;
  }>;
}

interface CourseGroup {
  name: string;
  poolId?: string;
  poolName?: string;
  creditsRequired?: number;
  courses: Course[];
  subcourses?: CourseGroup[];
  subcourseTitle?: string;
  subcourseCredits?: number;
}

interface Degree {
  _id: string;
  name: string;
}

// Course Card Component
const CourseCard: React.FC<{
  course: Course;
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

// Pool Accordion Component
const PoolAccordion: React.FC<{
  group: CourseGroup;
  selectedCourse: Course | null;
  onCourseSelect: (course: Course) => void;
  defaultExpanded?: boolean;
}> = ({ group, selectedCourse, onCourseSelect, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

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
                {group.courses.map((course) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    isSelected={selectedCourse?._id === course._id}
                    onClick={() => onCourseSelect(course)}
                  />
                ))}
              </div>

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
  course: Course | null;
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

  const groupedRequisites = groupPrerequisites(course.requisites || []);
  const formatCode = (id: string) => `${id.slice(0, 4)} ${id.slice(4)}`;

  return (
    <motion.div
      className="course-details-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      key={course._id}
    >
      <div className="course-details-header">
        <h2 className="details-header-code">{formatCode(course._id)}</h2>
        <p className="details-header-title">{course.title}</p>
      </div>

      <div className="course-details-body">
        <div className="details-section">
          <h4 className="details-section-title">
            <CreditIcon /> Credits
          </h4>
          <div className="details-section-content">
            <span className="credits-badge">
              {course.credits} Credits
            </span>
          </div>
        </div>

        <div className="details-section">
          <h4 className="details-section-title">Prerequisites & Corequisites</h4>
          <div className="details-section-content">
            {groupedRequisites.length > 0 ? (
              <div className="requisites-list">
                {groupedRequisites.map((group: { type: string; codes: string[] }, idx: number) => (
                  <div key={idx} className="requisite-item">
                    <span className="requisite-type">
                      {group.type.toLowerCase() === "pre" ? "Prereq" : "Coreq"}
                    </span>
                    <span className="requisite-codes">{group.codes.join(" or ")}</span>
                  </div>
                ))}
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

        {course.components && (
          <div className="details-section">
            <h4 className="details-section-title">Components</h4>
            <div className="details-section-content">{course.components}</div>
          </div>
        )}

        {course.notes && (
          <div className="details-section">
            <h4 className="details-section-title">Notes</h4>
            <div className="details-section-content">{course.notes}</div>
          </div>
        )}

        <CourseSectionButton code={course._id} title={course.title} hidden={true} />
      </div>
    </motion.div>
  );
};

// Mobile Course Modal Component
const CourseModal: React.FC<{
  course: Course | null;
  onClose: () => void;
}> = ({ course, onClose }) => {
  if (!course) return null;

  const groupedRequisites = groupPrerequisites(course.requisites || []);
  const formatCode = (id: string) => `${id.slice(0, 4)} ${id.slice(4)}`;

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
            <h2 className="details-header-code">{formatCode(course._id)}</h2>
            <p className="details-header-title">{course.title}</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="course-modal-body">
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
              {groupedRequisites.length > 0 ? (
                <div className="requisites-list">
                  {groupedRequisites.map((group: { type: string; codes: string[] }, idx: number) => (
                    <div key={idx} className="requisite-item">
                      <span className="requisite-type">
                        {group.type.toLowerCase() === "pre" ? "Prereq" : "Coreq"}
                      </span>
                      <span className="requisite-codes">{group.codes.join(" or ")}</span>
                    </div>
                  ))}
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

          {course.components && (
            <div className="details-section">
              <h4 className="details-section-title">Components</h4>
              <div className="details-section-content">{course.components}</div>
            </div>
          )}

          {course.notes && (
            <div className="details-section">
              <h4 className="details-section-title">Notes</h4>
              <div className="details-section-content">{course.notes}</div>
            </div>
          )}

          <CourseSectionButton code={course._id} title={course.title} hidden={true} />
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main CoursePage Component
const CoursePage: React.FC = () => {
  const [selectedDegree, setSelectedDegree] = useState<string>("Select Degree");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
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
    String(value).toLowerCase().replace(/\s+/g, "");
  
  const filteredCourseList = useMemo(() => {
    return courseList
      .map((group: CourseGroup) => ({
        ...group,
        courses: group.courses.filter((course: Course) =>
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
              <div
                className="degree-dropdown-item all-courses"
                onClick={handleSelectAllCourses}
              >
                All Courses
              </div>
              {degrees.length === 0 ? (
                <div className="degree-dropdown-item" style={{ opacity: 0.5 }}>
                  Loading degrees...
                </div>
              ) : (
                degrees.map((degree: Degree) => (
                  <div
                    key={degree._id}
                    className="degree-dropdown-item"
                    onClick={() => handleSelectDegree(degree)}
                  >
                    {degree.name}
                  </div>
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
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p className="loading-text">Loading courses...</p>
            </div>
          ) : selectedDegree === "Select Degree" ? (
            <div className="empty-courses-state">
              <div className="empty-courses-icon">
                <GraduationCapIcon />
              </div>
              <h3 className="empty-courses-title">Select a Degree</h3>
              <p className="empty-courses-text">
                Choose a degree program from the dropdown above to browse its courses, or select &quot;All Courses&quot; to see everything.
              </p>
            </div>
          ) : filteredCourseList.length === 0 ? (
            <div className="empty-courses-state">
              <div className="empty-courses-icon">
                <SearchIcon />
              </div>
              <h3 className="empty-courses-title">No Courses Found</h3>
              <p className="empty-courses-text">
                {searchTerm
                  ? `No courses match "${searchTerm}". Try a different search term.`
                  : "No courses available for this selection."}
              </p>
            </div>
          ) : (
            <>
              {searchTerm && (
                <div className="results-count">
                  Found <strong>{totalCourses}</strong> course{totalCourses !== 1 ? "s" : ""} matching &quot;{searchTerm}&quot;
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
          )}
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
