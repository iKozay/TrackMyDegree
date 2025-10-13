/* eslint-disable prettier/prettier */

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
        course.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (visibleCourses.length === 0) return null;

    return (
        <Accordion.Item eventKey={eventKey}>
            <Accordion.Header>{title}</Accordion.Header>
            <Accordion.Body>
                <Container>
                    {visibleCourses.map((course) => {
                        const isSelected = selectedCourse?.code === course.code;
                        return (
                            <DraggableCourse
                                key={`${containerId}-${course.code}`}
                                internalId={`${containerId}-${course.code}`}
                                courseCode={course.code}
                                title={course.code}
                                disabled={isCourseAssigned(course.code)}
                                isReturning={returning}
                                isSelected={isSelected}
                                onSelect={onSelect}
                                containerId={containerId}
                                isInTimeline={isCourseAssigned(course.code)}
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
