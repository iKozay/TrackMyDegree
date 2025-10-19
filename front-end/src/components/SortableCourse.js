import React from 'react';
import warningIcon from '../icons/warning.png'; // Import warning icon
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableCourse component for semester items
export const SortableCourse = ({
  internalId,
  courseCode,
  disabled,
  isSelected,
  isDraggingFromSemester,
  onSelect,
  containerId,
  prerequisitesMet, // New prop
  isOffered, // New prop
  removeButton,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: internalId,
    data: {
      type: 'course',
      courseCode,
      containerId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const className = `course-item${disabled ? ' disabled' : ''}${
    isDragging ? ' dragging' : ''
  }${isDraggingFromSemester ? ' dragging-from-semester' : ''}${isSelected ? ' selected' : ''}`;

  const getWarningMessage = () => {
    const warnings = [];
    if (!prerequisitesMet) {
      warnings.push('Prerequisites not met');
    }
    if (!isOffered) {
      warnings.push('Not offered in this term');
    }
    return warnings.join(', ');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(courseCode);
      }}
    >
      {courseCode}
      {(!prerequisitesMet || !isOffered) && (
        <div className="warning-container">
          <img src={warningIcon} alt="Warning: prerequisites not met" className="warning-icon" />
          <div className={`warning-tooltip ${isSelected ? 'selected' : ''}`}>{getWarningMessage()}</div>
        </div>
      )}
      {removeButton}
    </div>
  );
};
