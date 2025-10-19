/* eslint-disable prettier/prettier */
// CourseItem.js
import React from 'react';
import { SortableCourse } from "./SortableCourse";
import { RemoveButton } from './RemoveButton';
export const CourseItem = ({ course, instanceId, selectedCourse, activeId, onSelect, handleReturn, containerId, prerequisitesMet, isOffered }) => {
    const isSelected = selectedCourse?.code === course.code;
    const isDraggingFromSemester = activeId === instanceId;

    return (
        <SortableCourse
            key={instanceId}
            internalId={instanceId}
            courseCode={course.code}
            title={course.code}
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
