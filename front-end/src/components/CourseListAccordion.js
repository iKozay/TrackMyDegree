import React from "react";
import Accordion from 'react-bootstrap/Accordion';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import '../css/CourseListPage.css';

const CourseListAccordion = ({ courseList, selectedCourse, setSelectedCourse }) => {

  return (
    <Accordion className='course-list-accordion' alwaysOpen>
      {courseList.map((courseSection) => (
        <Accordion.Item eventKey={courseSection.poolName} key={courseSection.poolName}>
          <Accordion.Header style={{ margin: '0px' }}>
            <b>{courseSection.poolName}</b>
          </Accordion.Header>
            <Accordion.Body>
              <Container className="course-list-container">
                  {courseSection.courses.map((course) => (
                    <Card key={course.code} style={{backgroundColor: `${selectedCourse && course.code === selectedCourse.code ? "lightgray" : "white"}`}} onClick={() => setSelectedCourse(course)} className="cursor-pointer course-card">
                      <Card.Body className="course-list-card-body">
                        <Card.Title>
                          {course.code.slice(0, 4)} {course.code.slice(4)}
                        </Card.Title>
                        <Card.Subtitle style={{color: 'gray'}}>
                          {course.credits} credits
                        </Card.Subtitle>
                        {/* <Card.Body style={{padding: '10px'}}>
                          {course.title.slice(9)}
                        </Card.Body> */}
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