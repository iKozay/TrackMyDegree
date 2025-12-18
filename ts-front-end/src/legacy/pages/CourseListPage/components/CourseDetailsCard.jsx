import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'react-bootstrap';
import { groupPrerequisites } from '../../../utils/groupPrerequisites.jsx';
import CourseSectionButton from '../../../components/SectionModal.jsx';

/**
 * Component for displaying course details
 * Reusable for both desktop card and mobile modal
 */
const CourseDetailsCard = ({ course, showCard = true }) => {
  if (!course) {
    return <p>No course selected.</p>;
  }

  const groupedRequisites = groupPrerequisites(course.requisites || []);

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
        {groupedRequisites.length > 0 ? (
          <ul>
            {groupedRequisites.map((group) => (
              <li key={`${group.type}-${group.codes.join('-')}`}>
                {group.type.toLowerCase() === 'pre' ? 'Prerequisite: ' : 'Corequisite: '}
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
          <CourseSectionButton title={course.title} hidden={true} />
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

// Add PropTypes for ESLint + SonarQube
CourseDetailsCard.propTypes = {
  course: PropTypes.shape({
    title: PropTypes.string,
    credits: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    description: PropTypes.string,
    components: PropTypes.string,
    notes: PropTypes.string,
    requisites: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        codes: PropTypes.arrayOf(PropTypes.string),
      }),
    ),
  }),
  showCard: PropTypes.bool,
};

//Default props
CourseDetailsCard.defaultProps = {
  course: null,
  showCard: true,
};

export default CourseDetailsCard;
