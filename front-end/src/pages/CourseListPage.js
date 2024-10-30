import React, { useEffect, useState } from "react";
import computerScienceGroup from "../course data/soen_courses/computer_science_group.json";
import soenElectives from "../course data/soen_courses/electives.json";
import soenCore from '../course data/soen_courses/soen_core.json';
import engineeringNaturalScience from '../course data/soen_courses/engineering_natural_science_group.json';
import "bootstrap/dist/css/bootstrap.min.css";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Accordion from 'react-bootstrap/Accordion';
import Card from 'react-bootstrap/Card';
import Dropdown from "react-bootstrap/Dropdown";

const degrees = ['Software Engineering', 'Computer Engineering', 'Electrical Engineering'];
const soenCourses = [soenCore, computerScienceGroup, engineeringNaturalScience, soenElectives];
const soenCourseSections = ['Software Engineering Core', 'Computer Science Group', 'Engineering and Natural Science Group', 'Software Engineering Electives'];

function CourseListPage () {

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedDegree, setSelectedDegree] = useState('Select Degree');
  const [courseList, setCourseList] = useState(null);
  const [courseSectionsList, setCourseSectionsList] = useState(null);


  useEffect(() =>  {
    switch(selectedDegree) {
      case 'Software Engineering':
        setCourseList(soenCourses);
        setCourseSectionsList(soenCourseSections);
        setSelectedCourse(null);
        break;
      case 'Computer Engineering':
        setCourseList(null);
        setCourseSectionsList(null);
        setSelectedCourse(null);
        break;
      default:
        setCourseList(null);
        setCourseSectionsList(null);
        setSelectedCourse(null);
        break;
    }
  }, [selectedDegree]);



  return (
    <Container fluid>
      <div className='course-list-div'>
        <h3>Select Degree</h3>
        <Dropdown>
          <Dropdown.Toggle id="dropdown-basic" className="course-list-dropdown-toggle">
            {selectedDegree}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {degrees.map((degree, index) => (
              <Dropdown.Item key={index} onClick={() => setSelectedDegree(degree)}>
                {degree}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      
      <Row>
        <Col sm={7}>
          {courseList && courseSectionsList &&
          <Accordion className='course-list-accordion' alwaysOpen>
            {soenCourses.map((courses, index) => (
              <Accordion.Item eventKey={soenCourseSections[index]} key={soenCourseSections[index]}>
                <Accordion.Header><b>{soenCourseSections[index]}</b></Accordion.Header>
                  <Accordion.Body>
                    <Container className="course-list-container">
                        {courses.map((course) => (
                          <Card key={course.title} style={{backgroundColor: `${selectedCourse && course.title === selectedCourse.title ? "lightgray" : "white"}`}} onClick={() => setSelectedCourse(course)} className="cursor-pointer">
                          <Card.Body className="course-list-card-body">
                            <Card.Title>
                              {course.title.slice(0, 8)}
                            </Card.Title>
                            <Card.Body>
                              {course.title.slice(9)}
                            </Card.Body>
                          </Card.Body>
                        </Card>
                        ))}
                    </Container>
                  </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
          }
        </Col>
        <Col sm={5}>
          {selectedCourse &&
            <Card className="course-list-card">
              <Card.Body>
                <Card.Title><b>{selectedCourse.title}</b></Card.Title>
                <Card.Text>
                  <br/><b>Credits:</b> {selectedCourse.credits}
                </Card.Text>
                <Card.Text>
                  <b>Prerequisites:</b> {selectedCourse.prerequisites !== '' ? selectedCourse.prerequisites : 'None'}
                </Card.Text>
                <Card.Text>
                  <b>Corequisites:</b> {selectedCourse.corequisites !== '' ? selectedCourse.corequisites : 'None'}
                </Card.Text>
                <Card.Text>
                  <b>Description:</b> {selectedCourse.description}
                </Card.Text>
                <Card.Text>
                  <b>Notes:</b> {selectedCourse.notes}
                </Card.Text>
              </Card.Body>
            </Card>
          }
        </Col>
      </Row>
    </Container>
  );
}

export default CourseListPage;