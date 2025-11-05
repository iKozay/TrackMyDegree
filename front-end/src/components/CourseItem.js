/* eslint-disable prettier/prettier */
// CourseItem.js
import React from 'react';
import { SortableCourse } from "./SortableCourse";
import { RemoveButton } from './RemoveButton';
export const CourseItem = ({ course, instanceId, selectedCourse, activeId, onSelect, handleReturn, containerId, prerequisitesMet, isOffered }) => {
    const isSelected = selectedCourse?._id === course._id;
    const isDraggingFromSemester = activeId === instanceId;

    return (
        <SortableCourse
            key={instanceId}
            internalId={instanceId}
            courseCode={course._id}
            title={course._id}
            disabled={false}
            isSelected={isSelected}
            isDraggingFromSemester={isDraggingFromSemester}
            onSelect={onSelect}
            containerId={containerId}
            prerequisitesMet={prerequisitesMet}
            isOffered={isOffered}
            removeButton={<RemoveButton isSelected={isSelected} onRemove={() => handleReturn(instanceId)} />
            }
        />
    );
};
