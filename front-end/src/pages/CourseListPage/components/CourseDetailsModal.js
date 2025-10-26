// src/pages/CourseListPage/components/CourseDetailsModal.js
import React from 'react';
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

export default CourseDetailsModal;