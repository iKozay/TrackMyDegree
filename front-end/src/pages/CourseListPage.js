import React, { useEffect, useState } from "react";
import computerScienceGroup from "../course data/soen_courses/computer_science_group.json";
import soenElectives from "../course data/soen_courses/soen_electives.json";
import soenCore from '../course data/soen_courses/soen_core.json';
import engineeringNaturalScience from '../course data/soen_courses/engineering_natural_science_group.json';
import engineeringCore from '../course data/engineering_core.json';
import humanities from '../course data/general_education_electives/humanities.json';
import otherStudies from '../course data/general_education_electives/other_complementary_studies.json';
import socialSciences from '../course data/general_education_electives/social_sciences.json';
import "bootstrap/dist/css/bootstrap.min.css";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Dropdown from "react-bootstrap/Dropdown";
import CourseListAccordion from "../components/CourseListAccordion";

const degrees = ['Software Engineering', 'Computer Engineering', 'Electrical Engineering'];
const genEdElec = [
  {title: 'Humanities', courseList: humanities},
  {title: 'Social Sciences', courseList: socialSciences},
  {title: 'Other Complementary Studies', courseList: otherStudies},
];
const soenCourses = [
  {title: 'Engineering Core', credits: 30.5, courseList: engineeringCore, subcourseTitle: 'General Education Electives', subcourseCredits: 3, subcourses: genEdElec},
  {title: 'Software Engineering Core', credits: 47.5, courseList: soenCore},
  {title: 'Computer Science Group', credits: 23, courseList: computerScienceGroup},
  {title: 'Engineering and Natural Science Group', credits: 3, courseList: engineeringNaturalScience},
  {title: 'Software Engineering Electives', credits: 16, courseList: soenElectives, elective: true},
];

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