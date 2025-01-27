import React, { useEffect, useState } from "react";
import soenCourses from "../course data/soen_courses";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Card, Col, Row, Container, Dropdown } from "react-bootstrap";
import CourseListAccordion from "../components/CourseListAccordion";
import '../css/CourseListPage.css';


const degrees = ['Software Engineering', 'Computer Engineering', 'Electrical Engineering'];

function CourseListPage () {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 767);
  const [showPopup, setShowPopup] = useState(false);

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
        setCourseList(null);
        setSelectedCourse(null);
        break;
      default:
        setCourseList(null);
        setSelectedCourse(null);
        break;
    }
  }, [selectedDegree]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 767);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop && selectedCourse) {
      setShowPopup(true);
    }
  }, [isDesktop, selectedCourse]);

  function hidePopup() {
    setShowPopup(false);
    setSelectedCourse(null);
  }

  return (
    <Container fluid>
      <div className='course-list-div'>
        <h3>Select Degree</h3>
        
        <Dropdown>
          <Dropdown.Toggle id="dropdown-basic" data-testid='degree-dropdown' className="course-list-dropdown-toggle">
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
      
      <Row style={{display: 'flex'}}>
        <Col sm={12} md={7}>
          {/* Only display course accordions if the user has selected a degree */}
          {courseList &&
            <CourseListAccordion courseList={courseList} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} />
          }
        </Col>
        {isDesktop && selectedCourse && (
        <Col md={5}>
          <Card className="course-display-card">
            <Card.Body>
              <Card.Title><b>{selectedCourse.title}</b></Card.Title>
              <Card.Text>
                <br /><b>Credits:</b> {selectedCourse.credits}
              </Card.Text>
              <Card.Text>
                <b>Prerequisites:</b> {selectedCourse.prerequisites || "None"}
              </Card.Text>
              <Card.Text>
                <b>Corequisites:</b> {selectedCourse.corequisites || "None"}
              </Card.Text>
              <Card.Text>
                <b>Description:</b> {selectedCourse.description}
              </Card.Text>
              <Card.Text>
                <b>Notes:</b> {selectedCourse.notes}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      )}
      {/* Display a popup for screens narrower than 767px */}
      {!isDesktop && (
        <Modal show={showPopup} onHide={() => hidePopup()}>
          <Modal.Header closeButton>
            <Modal.Title>{selectedCourse?.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedCourse ? (
              <>
                <p><b>Credits:</b> {selectedCourse.credits}</p>
                <p><b>Prerequisites:</b> {selectedCourse.prerequisites || "None"}</p>
                <p><b>Corequisites:</b> {selectedCourse.corequisites || "None"}</p>
                <p><b>Description:</b> {selectedCourse.description}</p>
                <p><b>Notes:</b> {selectedCourse.notes}</p>
              </>
            ) : (
              <p>No course selected.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <button onClick={() => hidePopup()} className="btn btn-secondary">
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
      </Row>
    </Container>
  );
}

export default CourseListPage;