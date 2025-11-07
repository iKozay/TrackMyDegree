/* eslint-disable prettier/prettier */
import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, Container } from "react-bootstrap";
import { DraggableCourse } from "./DraggableCourse";
import { RemoveButton } from "./RemoveButton";

export default function CourseAccordionSection({
    eventKey,
    title,
    courses,
    containerId,
    searchQuery,
    selectedCourse,
    returning,
    isCourseAssigned,
    onSelect,
    onRemoveCourse, // optional
}) {
    const visibleCourses = courses.filter((course) =>
        searchQuery.trim() === "" ||
        course._id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (visibleCourses.length === 0) return null;

    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>{title}</Accordion.Header>
            <Accordion.Body>
                <Container>
                    {visibleCourses.map((course) => {
                        const isSelected = selectedCourse?._id === course._id;
                        return (
                            <DraggableCourse
                                key={`${containerId}-${course._id}`}
                                internalId={`${containerId}-${course._id}`}
                                courseCode={typeof course === 'string' ? course : course._id}
                                title={course._id}
                                disabled={isCourseAssigned(course._id)}
                                isReturning={returning}
                                isSelected={isSelected}
                                onSelect={onSelect}
                                containerId={containerId}
                                isInTimeline={isCourseAssigned(course._id)}
                                onRemove={() => onRemoveCourse(course)}
                                removeButton={
                                    onRemoveCourse ? (
                                        <RemoveButton onRemove={() => onRemoveCourse(course)} isSelected={isSelected} />
                                    ) : undefined
                                }
                            />
                        );
                    })}
                </Container>
            </Accordion.Body>
        </Accordion.Item>
    );
}

CourseAccordionSection.propTypes = {
    eventKey: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    courses: PropTypes.arrayOf(PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string,
        credits: PropTypes.number,
        description: PropTypes.string,
        offeredIn: PropTypes.arrayOf(PropTypes.string),
        prerequisites: PropTypes.arrayOf(PropTypes.string),
        corequisites: PropTypes.arrayOf(PropTypes.string),
    })).isRequired,
    containerId: PropTypes.string.isRequired,
    searchQuery: PropTypes.string.isRequired,
    selectedCourse: PropTypes.shape({
        _id: PropTypes.string.isRequired,
        title: PropTypes.string,
        credits: PropTypes.number,
        description: PropTypes.string,
        offeredIn: PropTypes.arrayOf(PropTypes.string),
        prerequisites: PropTypes.arrayOf(PropTypes.string),
        corequisites: PropTypes.arrayOf(PropTypes.string),
    }),
    returning: PropTypes.bool,
    isCourseAssigned: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    onRemoveCourse: PropTypes.func,
};
