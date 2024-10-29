import React, { useState } from 'react';
import CoursePopup from "./CoursePopup";

function CourseTile({ course }) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleTileClick = () => {
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <div>
      <div className="course-tile" onClick={handleTileClick}>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
      </div>
      {isPopupOpen && <CoursePopup course={course} onClose={closePopup} />}
    </div>
  );
}

export default CourseTile;