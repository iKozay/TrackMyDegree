import React from "react";
import Accordion from 'react-bootstrap/Accordion';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';

const CourseListAccordion = ({ courseList, selectedCourse, setSelectedCourse }) => {

  return (
    <Accordion className='course-list-accordion' alwaysOpen>
      {courseList.map((courseSection) => (
        <Accordion.Item eventKey={courseSection.title} key={courseSection.title}>
          <Accordion.Header>
            <b>{courseSection.title}</b>&nbsp;
            {courseSection.credits !== undefined && (courseSection.elective ? `(Minimum of ${courseSection.credits} credits)` : `(${courseSection.credits} credits)`)}
          </Accordion.Header>
            <Accordion.Body>
              <Container className="course-list-container">
                  {courseSection.courseList.map((course) => (
                    <Card key={course.title} style={{backgroundColor: `${selectedCourse && course.title === selectedCourse.title ? "lightgray" : "white"}`}} onClick={() => setSelectedCourse(course)} className="cursor-pointer">
                      <Card.Body className="course-list-card-body">
                        <Card.Title>
                          {course.id}
                        </Card.Title>
                        <Card.Subtitle style={{color: 'gray'}}>
                          {course.credits} credits
                        </Card.Subtitle>
                        <Card.Body>
                          {course.title.slice(9)}
                        </Card.Body>
                      </Card.Body>
                    </Card>
                  ))}
              </Container>
              {/* If any course section has subcourses nested, use the same Accordion component to nest them in one accordion item */}
              {courseSection.subcourses !== undefined &&
                <Container style={{ padding: '15px 25px'}}>
                  <h3><b>{courseSection.subcourseTitle}</b> (Minimum of {courseSection.subcourseCredits} credits)</h3>
                  <CourseListAccordion courseList={courseSection.subcourses} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} />
                </Container>
              }
            </Accordion.Body>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

export default CourseListAccordion;