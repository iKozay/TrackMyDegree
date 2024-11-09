import React, { useEffect, useState } from "react";
import soenCourses from "../course data/soen_courses";
import "bootstrap/dist/css/bootstrap.min.css";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Dropdown from "react-bootstrap/Dropdown";
import CourseListAccordion from "../components/CourseListAccordion";

const degrees = ['Software Engineering', 'Computer Engineering', 'Electrical Engineering'];

function CourseListPage () {

  const [selectedDegree, setSelectedDegree] = useState('Select Degree');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseList, setCourseList] = useState(null);


  useEffect(() =>  {
    switch(selectedDegree) {
      case 'Software Engineering':
        setCourseList(soenCourses);
        setSelectedCourse(null);
        break;
      case 'Computer Engineering':
        //courses for other degrees have not been scraped yet, but we will expand our databases throughout the next releases
        setCourseList(null);
        setSelectedCourse(null);
        break;
      default:
        setCourseList(null);
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
          {/* Only display course accordions if the user has selected a degree */}
          {courseList &&
            <CourseListAccordion courseList={courseList} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} />
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