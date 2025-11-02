// src/pages/CourseListPage/components/CourseDetailsModal.js
import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import CourseDetailsCard from './CourseDetailsCard';

/**
 * Modal component for displaying course details on mobile
 */
const CourseDetailsModal = ({ show, onHide, course }) => {
  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{course?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <CourseDetailsCard course={course} showCard={false} />
      </Modal.Body>
      <Modal.Footer>
        <button onClick={onHide} className="btn btn-secondary">
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

CourseDetailsModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  course: PropTypes.shape({
    title: PropTypes.string,
    code: PropTypes.string,
    description: PropTypes.string,
    credits: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

CourseDetailsModal.defaultProps = {
  course: null,
};

export default CourseDetailsModal;
