import React from 'react';
import PropTypes from 'prop-types';
import Accordion from 'react-bootstrap/Accordion';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import '../css/CourseListPage.css';

const CourseListAccordion = ({ courseList, selectedCourse, setSelectedCourse }) => {
  return (
    <Accordion className="course-list-accordion" alwaysOpen>
      {courseList.map((courseSection) => (
        <Accordion.Item eventKey={courseSection.name} key={courseSection.name}>
          <Accordion.Header>
            <b className="course-section-title">{courseSection.name}</b>
          </Accordion.Header>
          <Accordion.Body>
            <Container className="course-list-container">
              {courseSection.courses.map((course) => (
                <Card
                  key={course._id}
                  style={{
                    backgroundColor: `${selectedCourse && course._id === selectedCourse._id ? 'lightgray' : 'white'}`,
                  }}
                  onClick={() => setSelectedCourse(course)}
                  className="cursor-pointer course-card"
                >
                  <Card.Body className="course-list-card-body">
                    <Card.Title className="course-code">
                      {course._id.slice(0, 4)} {course._id.slice(4)}
                    </Card.Title>
                    <Card.Subtitle className="course-credits">{course.credits} credits</Card.Subtitle>
                    <Card.Text className="course-title">{course.title.slice(9)}</Card.Text>
                  </Card.Body>
                </Card>
              ))}
            </Container>
            {courseSection.subcourses !== undefined && (
              <Container className="subcourse-container">
                <h3 className="subcourse-title">
                  <b>{courseSection.subcourseTitle}</b> (Minimum of {courseSection.subcourseCredits} credits)
                </h3>
                <CourseListAccordion
                  courseList={courseSection.subcourses}
                  selectedCourse={selectedCourse}
                  setSelectedCourse={setSelectedCourse}
                />
              </Container>
            )}
          </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

CourseListAccordion.propTypes = {
    courseList: PropTypes.arrayOf(PropTypes.shape({
        poolId: PropTypes.string,
        poolName: PropTypes.string.isRequired,
        creditsRequired: PropTypes.number,
        courses: PropTypes.arrayOf(PropTypes.shape({
            _id: PropTypes.string.isRequired,
            title: PropTypes.string.isRequired,
            credits: PropTypes.number.isRequired,
            description: PropTypes.string,
            offeredIn: PropTypes.arrayOf(PropTypes.string),
            prerequisites: PropTypes.arrayOf(PropTypes.string),
            corequisites: PropTypes.arrayOf(PropTypes.string),
        })).isRequired,
        subcourses: PropTypes.arrayOf(PropTypes.shape({
            poolName: PropTypes.string,
            courses: PropTypes.array,
        })),
        subcourseTitle: PropTypes.string,
        subcourseCredits: PropTypes.number,
    })).isRequired,
    selectedCourse: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string,
        credits: PropTypes.number,
        description: PropTypes.string,
        offeredIn: PropTypes.arrayOf(PropTypes.string),
        prerequisites: PropTypes.arrayOf(PropTypes.string),
        corequisites: PropTypes.arrayOf(PropTypes.string),
    }),
    setSelectedCourse: PropTypes.func.isRequired,
};

export default CourseListAccordion;
