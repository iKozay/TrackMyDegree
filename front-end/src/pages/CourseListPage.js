import React from "react";
import compSoenCourses from "../course data/COMP_SOEN_courses.json";
import CourseTile from "../components/CourseTile";

function CourseListPage () {
    return (
        <div>
            <p>course list</p>
            {compSoenCourses.map((course) => (
                <CourseTile key={course.title} course={course} />
            ))}
        </div>
    );
}

export default CourseListPage;