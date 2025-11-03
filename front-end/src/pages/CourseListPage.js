// src/pages/CourseListPage.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Col, Row, Container } from 'react-bootstrap';
import { motion } from 'framer-motion';
import CourseListAccordion from '../components/CourseListAccordion';
import '../css/CourseListPage.css';

// Custom hooks
import useDegrees from './CourseListPage/hooks/useDegree';
import useCourses from './CourseListPage/hooks/useCourses';
import useResponsive from './CourseListPage/hooks/useResponsive';

// Components
import DegreeSelector from './CourseListPage/components/DegreeSelector';
import CourseDetailsCard from './CourseListPage/components/CourseDetailsCard';
import CourseDetailsModal from './CourseListPage/components/CourseDetailsModal';

/**
 * Page for browsing courses by degree with detailed information
 * Responsive design with desktop card view and mobile modal view
 */
function CourseListPage() {
  const [selectedDegree, setSelectedDegree] = useState('Select Degree');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  // Custom hooks
  const { degrees } = useDegrees();
  const { courseList, fetchCoursesByDegree, fetchAllCourses } = useCourses();
  const { isDesktop } = useResponsive();

  // Open modal on mobile when course is selected
  useEffect(() => {
    if (!isDesktop && selectedCourse) {
      setShowPopup(true);
    }
  }, [isDesktop, selectedCourse]);

  // Handle degree selection
  const handleSelectDegree = (degree) => {
    setSelectedDegree(degree.name);
    fetchCoursesByDegree(degree.id);
  };

  // Handle "All Courses" selection
  const handleSelectAllCourses = () => {
    setSelectedDegree('All Courses');
    fetchAllCourses();
  };

  // Handle modal close
  const hidePopup = () => {
    setShowPopup(false);
    setSelectedCourse(null);
  };

  // Filter courses based on search term
  const filteredCourseList = courseList
    .map((group) => ({
      ...group,
      courses: group.courses.filter((course) => course.title.toLowerCase().includes(searchTerm.toLowerCase())),
    }))
    .filter((group) => group.courses.length > 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <Container fluid>
        <DegreeSelector
          degrees={degrees}
          selectedDegree={selectedDegree}
          searchTerm={searchTerm}
          onDegreeSelect={handleSelectDegree}
          onAllCoursesSelect={handleSelectAllCourses}
          onSearchChange={setSearchTerm}
        />

        <Row style={{ display: 'flex', flexWrap: 'nowrap', gap: '40px' }}>
          <Col sm={12} md={7}>
            {filteredCourseList.length !== 0 && (
              <CourseListAccordion
                courseList={filteredCourseList}
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
              />
            )}
          </Col>

          {/* Desktop: Show course details card */}
          {isDesktop && selectedCourse && (
            <Col md={5}>
              <CourseDetailsCard course={selectedCourse} />
            </Col>
          )}

          {/* Mobile: Show course details modal */}
          {!isDesktop && <CourseDetailsModal show={showPopup} onHide={hidePopup} course={selectedCourse} />}
        </Row>
      </Container>
    </motion.div>
  );
}

export default CourseListPage;
