/* eslint-disable prettier/prettier */
// CourseItem.js
import React from 'react';
import PropTypes from 'prop-types';
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

CourseItem.propTypes = {
    course: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string,
        credits: PropTypes.number,
        description: PropTypes.string,
        offeredIn: PropTypes.arrayOf(PropTypes.string),
        prerequisites: PropTypes.arrayOf(PropTypes.string),
        corequisites: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    instanceId: PropTypes.string.isRequired,
    selectedCourse: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string,
        credits: PropTypes.number,
        description: PropTypes.string,
        offeredIn: PropTypes.arrayOf(PropTypes.string),
        prerequisites: PropTypes.arrayOf(PropTypes.string),
        corequisites: PropTypes.arrayOf(PropTypes.string),
    }),
    activeId: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    handleReturn: PropTypes.func.isRequired,
    containerId: PropTypes.string.isRequired,
    prerequisitesMet: PropTypes.bool,
    isOffered: PropTypes.bool,
};
