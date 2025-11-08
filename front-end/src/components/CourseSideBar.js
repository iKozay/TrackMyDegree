/* eslint-disable prettier/prettier */
import React from 'react';
import { Accordion } from "react-bootstrap";
import CourseAccordionSection from "./CourseAccordionSection";
import { Droppable } from "./Droppable"; // your Droppable component

export const CourseSidebar = ({
    showCourseList,
    toggleCourseList,
    searchQuery,
    setSearchQuery,
    coursePools,
    remainingCourses,
    deficiencyCourses,
    exemptionCourses,
    deficiencyCredits,
    exemptionCredits,
    selectedCourse,
    returning,
    isCourseAssigned,
    onSelect,
    removeDeficiencyCourse,
    removeExemptionCourse,
}) => {
    return (
        <Droppable className="courses-with-button" id="courses-with-button">
            <div className={`timeline-left-bar ${showCourseList ? "" : "hidden"}`}>
                {showCourseList && (
                    <div>
                        <h4 className="mt-1">Course List</h4>
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="course-search-input"
                        />

                        <div className="course-list-container-timeline">
                            <Droppable id="courseList" className="course-list">
                                <Accordion>
                                    {coursePools.map((pool) => (
                                        <CourseAccordionSection
                                            key={pool._id}
                                            eventKey={pool._id}
                                            title={pool.name}
                                            courses={pool.courses}
                                            containerId="courseList"
                                            searchQuery={searchQuery}
                                            selectedCourse={selectedCourse}
                                            returning={returning}
                                            isCourseAssigned={isCourseAssigned}
                                            onSelect={onSelect}
                                        />
                                    ))}

                                    <CourseAccordionSection
                                        eventKey="remaining"
                                        title="Remaining Courses"
                                        courses={remainingCourses}
                                        containerId="courseList"
                                        searchQuery={searchQuery}
                                        selectedCourse={selectedCourse}
                                        returning={returning}
                                        isCourseAssigned={isCourseAssigned}
                                        onSelect={onSelect}
                                    />

                                    {deficiencyCredits > 0 && (
                                        <CourseAccordionSection
                                            eventKey="deficiencies"
                                            title="Deficiency Courses"
                                            courses={deficiencyCourses}
                                            containerId="deficiencyList"
                                            searchQuery={searchQuery}
                                            selectedCourse={selectedCourse}
                                            returning={returning}
                                            isCourseAssigned={isCourseAssigned}
                                            onSelect={onSelect}
                                            onRemoveCourse={removeDeficiencyCourse}
                                        />
                                    )}

                                    {exemptionCredits > 0 && (
                                        <CourseAccordionSection
                                            eventKey="exemptions"
                                            title="Exempted Courses"
                                            courses={exemptionCourses}
                                            containerId="exemptionList"
                                            searchQuery={searchQuery}
                                            selectedCourse={selectedCourse}
                                            returning={returning}
                                            isCourseAssigned={isCourseAssigned}
                                            onSelect={onSelect}
                                            onRemoveCourse={removeExemptionCourse}
                                        />
                                    )}
                                </Accordion>
                            </Droppable>
                        </div>
                    </div>
                )}
            </div>

            <button className="left-toggle-button" onClick={toggleCourseList}>
                {showCourseList ? "◀" : "▶"}
            </button>
        </Droppable>
    );
}
