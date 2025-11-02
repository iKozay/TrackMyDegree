import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';
export const DraggableCourse = ({ courseId, course, onCourseSelect, isSelected, onRemove, semesterId = null }) => {
    const isDraggable = course.status.status !== 'completed';
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: courseId,
        data: semesterId ? { source: 'timeline', semesterId } : { source: 'pool' },
        disabled: !isDraggable,
    });


    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // statuses: "planned" | "completed" | "inprogress" | "incomplete"
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'status-completed';
            case 'planned': return 'status-planned';
            case 'incomplete': return 'status-incomplete';
            case 'inprogress': return 'status-inprogress';
            default: return 'status-incomplete';
        }
    };

    return (

        <div
            ref={setNodeRef}
            style={style}
            className={`course-card ${getStatusColor(course.status.status)} ${isSelected ? 'selected' : ''
                } ${isDragging ? 'dragging' : ''} ${!isDraggable ? 'not-draggable' : ''}`}
        >



            <div className="course-content" onClick={() => onCourseSelect(courseId)}>
                <div className="course-code">{course.id}</div>
                <div className="course-name">{course.title}</div>
                <div className="course-credits">{course.credits} cr</div>
            </div>
            <div className="course-drag-handle" {...listeners} {...attributes}>
                ⋮⋮
            </div>
            {
                onRemove && <button
                    className="remove-course-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(courseId);
                    }}
                >
                    <X size={12} />
                </button>
            }

        </div>


    );
};

