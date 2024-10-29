import React from 'react';

function CoursePopup({ course, onClose }) {
  if (!course) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <h2>{course.title}</h2>
        <p>Credtis: {course.credits}</p>
        <p>{course.description}</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default CoursePopup;