/* eslint-disable prettier/prettier */
export const arePrerequisitesMet = (courseCode, currentSemesterIndex, courseInstanceMap, allCourses, semesters, semesterCourses) => {
    const genericCode = courseInstanceMap[courseCode] || courseCode;
    const course = allCourses.find((c) => c.code === genericCode);

    if (!course || !course.requisites || course.requisites.length === 0) {
        return true;
    }

    // Separate prerequisites and corequisites
    const prerequisites = course.requisites.filter(
        (r) => r.type.toLowerCase() === 'pre'
    );
    const corequisites = course.requisites.filter(
        (r) => r.type.toLowerCase() === 'co'
    );

    // Collect courses from all previous semesters
    const completedCourses = [];
    for (let i = 0; i < currentSemesterIndex; i++) {
        const semesterId = semesters[i]?.id;
        const coursesInSemester = semesterCourses[semesterId] || [];
        coursesInSemester.forEach((instanceId) => {
            const generic = courseInstanceMap[instanceId] || instanceId;
            completedCourses.push(generic);
        });
    }

    // Check prerequisites against completed courses only
    const prereqMet = prerequisites.every((prereq) => {
        if (prereq.group_id) {
            // For grouped prerequisites, at least one in the group must be completed.
            const group = prerequisites.filter(
                (p) => p.group_id === prereq.group_id
            );
            return group.some((p) => completedCourses.includes(p.code2));
        } else {
            return completedCourses.includes(prereq.code2);
        }
    });

    // For corequisites, check courses from previous semesters and current semester
    const currentSemesterId = semesters[currentSemesterIndex]?.id;
    const currentCourses = (semesterCourses[currentSemesterId] || []).map(
        (instanceId) => courseInstanceMap[instanceId] || instanceId
    );
    const availableCourses = [...completedCourses, ...currentCourses];

    const coreqMet = corequisites.every((coreq) => {
        if (coreq.group_id) {
            const group = corequisites.filter((c) => c.group_id === coreq.group_id);
            return group.some((c) => availableCourses.includes(c.code2));
        } else {
            return availableCourses.includes(coreq.code2);
        }
    });

    return prereqMet && coreqMet;
};