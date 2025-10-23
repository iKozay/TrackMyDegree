/* eslint-disable prettier/prettier */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
// DraggableCourse component for course list items
export const DraggableCourse = ({
    internalId,
    courseCode,
    disabled,
    isSelected,
    onSelect,
    containerId,
    className: extraClassName, // NEW prop
    isInTimeline, // NEW prop
    removeButton,
}) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: internalId,
        disabled,
        data: { type: 'course', courseCode, containerId },
    });

    const className = `course-item${disabled ? ' disabled' : ''}${isDragging ? ' dragging' : ''
        }${isSelected && !isDragging && !disabled ? ' selected' : ''}${extraClassName ? ' ' + extraClassName : ''}`;

    return (
        <>
            <div
                ref={setNodeRef}
                {...attributes}
                {...listeners}
                className={className}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(courseCode);
                }}
            >
                {courseCode}
                {isInTimeline && <span className="checkmark-icon">✔</span>}
                {removeButton}
            </div>

        </>

    );
};
