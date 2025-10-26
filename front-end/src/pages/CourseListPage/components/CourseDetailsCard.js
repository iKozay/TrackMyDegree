// src/pages/CourseListPage/components/CourseDetailsCard.js
import React from 'react';
import { Card } from 'react-bootstrap';
import { groupPrerequisites } from '../../../utils/groupPrerequisites';
import CourseSectionButton from '../../../components/SectionModal';

/**
 * Component for displaying course details
 * Reusable for both desktop card and mobile modal
 */
const CourseDetailsCard = ({ course, showCard = true }) => {
  if (!course) {
    return <p>No course selected.</p>;
  }

  const content = (
    <>
      {showCard && (
        <Card.Title>
          <b>{course.title}</b>
        </Card.Title>
      )}
      
      <Card.Text>
        {showCard && <br />}
        <b>Credits:</b> {course.credits}
      </Card.Text>

      <Card.Text>
        <p>
          <b>Prerequisites/Corequisites:</b>
        </p>
        {course.requisites && course.requisites.length > 0 ? (
          <ul>
            {groupPrerequisites(course.requisites).map((group, index) => (
              <li key={index}>
                {group.type.toLowerCase() === 'pre'
                  ? 'Prerequisite: '
                  : 'Corequisite: '}
                {group.codes.join(' or ')}
              </li>
            ))}
          </ul>
        ) : (
          <p>None</p>
        )}
      </Card.Text>

      <Card.Text>
        <p>
          <CourseSectionButton
            title={course.title}
            hidden={true}
          />
        </p>
      </Card.Text>

      <Card.Text>
        <b>Description:</b> {course.description}
      </Card.Text>

      {course.components && (
        <Card.Text>
          <b>Components:</b> {course.components}
        </Card.Text>
      )}

      {course.notes && (
        <Card.Text>
          <b>Notes:</b> {course.notes}
        </Card.Text>
      )}
    </>
  );

  return showCard ? (
    <Card className="course-display-card">
      <Card.Body>{content}</Card.Body>
    </Card>
  ) : (
    content
  );
};

export default CourseDetailsCard;