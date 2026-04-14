import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, Form } from 'react-bootstrap';

/**
 * Component for selecting a degree and searching courses
 */
const DegreeSelector = ({
  degrees,
  selectedDegree,
  searchTerm,
  onDegreeSelect,
  onAllCoursesSelect,
  onSearchChange,
}) => {
  return (
    <div className="course-list-div">
      <h3>Select Degree</h3>
      <Dropdown>
        <Dropdown.Toggle id="dropdown-basic" data-testid="degree-dropdown" className="course-list-dropdown-toggle">
          {selectedDegree}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {/* Option for All Courses */}
          <Dropdown.Item onClick={onAllCoursesSelect}>All Courses</Dropdown.Item>

          {/* List individual degrees */}
          {degrees.length === 0 ? (
            <Dropdown.Item disabled>Loading...</Dropdown.Item>
          ) : (
            degrees.map((degree) => (
              <Dropdown.Item
                key={degree._id || degree.name} // use unique id or name instead of index
                onClick={() => onDegreeSelect(degree)}
              >
                {degree.name}
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown>

      {/* Search Bar - only show when degree is selected */}
      {selectedDegree !== 'Select Degree' && (
        <Form className="search-course" onSubmit={(e) => e.preventDefault()}>
          <Form.Control
            type="text"
            placeholder="Search courses, e.g., ENCS 282"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Form>
      )}
    </div>
  );
};

//PropTypes validation
DegreeSelector.propTypes = {
  degrees: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selectedDegree: PropTypes.string.isRequired,
  searchTerm: PropTypes.string.isRequired,
  onDegreeSelect: PropTypes.func.isRequired,
  onAllCoursesSelect: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
};

export default DegreeSelector;
