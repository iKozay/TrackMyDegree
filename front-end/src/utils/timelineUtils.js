/* eslint-disable prettier/prettier */


export const buildTimelinePayload = ({
    tName,
    user,
    degree_Id,
    semesters,
    semesterCourses,
    courseInstanceMap,
    allCourses,
    deficiencyCourses,
    extendedCredit,

}) => {
    if (!tName || !tName.trim()) {
        return {
            error: "Timeline name is required!",
        }
    }
    if (!user || !user.id) {
        return {
            error: "User must be logged in!"
        }
    }
    if (!degree_Id) {
        return {
            error: "Degree ID is required!"
        };
    }

    const finalTimelineData = [];
    const exempted_courses = [];

    semesters.forEach((semester) => {
        const [season, year = '2020'] = semester.name.split(' ');

        if (
            semester.id.trim().toLowerCase() === 'exempted' ||
            semester.id.trim().toLowerCase() === 'transfered courses'
        ) {
            (semesterCourses[semester.id] || []).forEach((courseCode) => {
                const genericCode = courseInstanceMap[courseCode] || courseCode;
                const course = allCourses.find((c) => c._id === genericCode);
                if (course && course._id) {
                    exempted_courses.push(course._id);
                }
            });
        }

        const coursesForSemester = (semesterCourses[semester.id] || [])
            .map((courseCode) => {
                const genericCode = courseInstanceMap[courseCode] || courseCode;
                const course = allCourses.find((c) => c._id === genericCode);
                return course && course._id ? { courseCode: course._id } : null;
            })
            .filter(Boolean);

        const yearInt = isNaN(parseInt(year, 10)) ? 2020 : parseInt(year, 10);
        finalTimelineData.push({ season, year: yearInt, courses: coursesForSemester });
    });

    const deficiencyCoursescode = deficiencyCourses
        .map((courseCode) => {
            const genericCode = courseInstanceMap[courseCode._id] || courseCode._id;
            const course = allCourses.find((c) => c._id === genericCode);
            return course && course._id ? { courseCode: course._id } : null;
        })
        .filter(Boolean);

    if (deficiencyCourses.length > 0) {
        finalTimelineData.push({
            season: 'deficiencies',
            year: 2020,
            courses: deficiencyCoursescode,
        });
    }

    if (finalTimelineData.length === 0 && exempted_courses.length === 0) {
        return {
            error: "No valid data to save."
        };
    }

    const userTimeline = [
        {
            user_id: user.id,
            name: tName,
            items: finalTimelineData.map((item) => ({
                season: item.season,
                year: item.year,
                courses: item.courses.map((course) => course.courseCode),
            })),
            isExtendedCredit: extendedCredit || false,
        },
    ];

    return {
        user_id: userTimeline[0].user_id,
        timelineNameToSend: userTimeline[0].name,
        items: userTimeline[0].items,
        isExtended: userTimeline[0].isExtendedCredit,
        exempted_courses,
    };
}

export const getTimelineInfo = (timelineData, semesterCourses) => {
    const timlineInfo =
        timelineData.length > 0
            ? timelineData
            : Object.keys(semesterCourses).length > 0
                ? Object.entries(semesterCourses).map(([key, courses]) => {
                    const [season, year] = key.split(' ');
                    return {
                        season,
                        year: parseInt(year, 10),
                        courses,
                    };
                })
                : null;
    return timlineInfo;
};

export const parseCourses = (timelineInfo, courseInstanceMap, allCourses, extendedCredit) => {
    const nonExemptedData = [];
    let parsedExemptedCourses = [];
    const deficiency = { courses: [], credits: 0 };

    if (timelineInfo) {

        timelineInfo.forEach((data) => {
            let isExempted = false;

            if (data.term && typeof data.term === 'string') {
                isExempted = data.term.trim().toLowerCase().includes('exempted');
            } else if (data.season) {
                isExempted = data.season.trim().toLowerCase() === 'exempted';
            }

            // Handle deficiencies
            if (data.term === 'deficiencies 2020' && Array.isArray(data.courses)) {
                const newCourses = data.courses
                    .map((courseCode) => {
                        const genericCode = courseInstanceMap[courseCode] || courseCode;
                        const course = allCourses.find((c) => c._id === genericCode);
                        return course && course._id ? { code: course._id, credits: course.credits } : null;
                    })
                    .filter(Boolean);

                deficiency.courses.push(...newCourses);
                //Calculate total deficiency credits
                const totalDeficiencyCredits = newCourses.reduce((sum, course) => sum + (course.credits || 3), 0);
                deficiency.credits = totalDeficiencyCredits;

                data.term = '';
            }

            // Exempted courses
            if (isExempted) {
                // Extract courses from the exempted item.
                if (data.course && typeof data.course === 'string') {
                    parsedExemptedCourses.push(data.course.trim());
                } else if (Array.isArray(data.courses)) {
                    data.courses.forEach((course) => {
                        if (typeof course === 'string') {
                            parsedExemptedCourses.push(course.trim());
                        }
                    });
                }
            } else {
                // Add every timelineData item—even if courses is empty.
                nonExemptedData.push(data);
            }
        });

    } else {
        if (extendedCredit === null) {
            extendedCredit = false;
        }
        if (!extendedCredit) {
            parsedExemptedCourses = [
                'MATH201',
                'MATH203',
                'MATH204',
                'MATH205',
                'MATH206',
                'CHEM205',
                'PHYS204',
                'PHYS205',
            ];
        } else {
            parsedExemptedCourses = ['MATH201', 'MATH206'];
        }
    }

    // Remove duplicates.
    parsedExemptedCourses = [...new Set(parsedExemptedCourses)];

    return { nonExemptedData, parsedExemptedCourses, deficiency, extendedC: extendedCredit };
};

import { generateFourYearSemesters } from './SemesterUtils';
export const buildSemesterMap = (nonExemptedData, parsedExemptedCourses, startingSemester) => {
    const semesterMap = {};
    const semesterNames = new Set();

    nonExemptedData.forEach((data) => {
        let term = '';
        let courses = Array.isArray(data.courses)
            ? data.courses.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean)
            : [];

        if (data.term && typeof data.term === 'string') {
            term = data.term;
            if (data.course && typeof data.course === 'string') {
                courses.push(data.course.trim());
            }
        } else if (data.season && data.year) {
            term = data.season.trim().toLowerCase() === 'exempted' ? 'Exempted' : `${data.season} ${data.year}`;
        }

        if (term) {
            // Even if courses is empty, create the semester.
            if (!semesterMap[term]) {
                semesterMap[term] = [];
            }
            semesterMap[term].push(...courses);
            semesterNames.add(term);
        }
    });

    // Generate missing semesters
    if (startingSemester) {
        const generatedSemesters = generateFourYearSemesters(startingSemester);
        generatedSemesters.forEach((sem) => {
            if (!semesterNames.has(sem)) {
                semesterNames.add(sem);
                semesterMap[sem] = [];
            }
        });
    }

    // Add exempted courses
    if (parsedExemptedCourses.length > 0) {
        const exemptedKey = 'Exempted';
        semesterNames.add(exemptedKey);
        if (!semesterMap[exemptedKey]) {
            semesterMap[exemptedKey] = [];
        }
        parsedExemptedCourses.forEach((courseCode) => {
            if (!semesterMap[exemptedKey].includes(courseCode)) {
                semesterMap[exemptedKey].push(courseCode);
            }
        });
    }

    return { semesterMap, semesterNames };
};

// --- Helper: sort semesters ---
export const sortSemesters = (semesterNames) => {
    const order = { Winter: 1, 'Fall/Winter': 2, Summer: 3, Fall: 4 };
    return Array.from(semesterNames).sort((a, b) => {
        if (a.trim().toLowerCase() === 'exempted') return -1;
        if (b.trim().toLowerCase() === 'exempted') return 1;

        const [seasonA, yearA] = a.split(' ');
        const [seasonB, yearB] = b.split(' ');

        if (yearA !== yearB) return parseInt(yearA, 10) - parseInt(yearB, 10);
        return order[seasonA] - order[seasonB];
    });
};

export const isTheCourseAssigned = (courseCode, semesterCourses, courseInstanceMap) => {
    for (const semesterId in semesterCourses) {
        // Skip the "courseList" container
        if (semesterId === 'courseList') continue;

        const alreadyAssigned = semesterCourses[semesterId].some((instanceId) => {
            const baseCode = courseInstanceMap[instanceId] || instanceId;
            return baseCode === courseCode;
        });

        if (alreadyAssigned) return true;
    }
    return false;
};

export const generateUniqueId = (courseCode, uniqueIdCounter) => `${courseCode}-${uniqueIdCounter}`;

// Helper to remove a course from its current semester
export const removeCourseFromSemester = (draggedId, semesterCourses) => {
    const updated = { ...semesterCourses };
    for (const semId in updated) {
        updated[semId] = updated[semId].filter((code) => code !== draggedId);
    }
    return updated;
};

// Helper to calculate total credits in a semester
export const calculateSemesterCredits = (semesterId, semesterCourses, courseInstanceMap, allCourses) => {
    const courses = semesterCourses[semesterId] || [];
    return courses.reduce((sum, cCode) => {
        const genericCode = courseInstanceMap[cCode] || cCode;
        const course = allCourses.find((c) => c._id === genericCode);
        return sum + (course?.credits || 0);
    }, 0);
};

export const getMaxCreditsForSemesterName = (semesterName) => {
    if (semesterName.toLowerCase().includes('summer')) {
        return 15;
    }
    return 19;
}

export const parseMaxCreditsFromPoolName = (poolName) => {
    // Regex to find e.g. "(47.5 credits)"
    const match = poolName.match(/\(([\d.]+)\s*credits?\)/i);
    if (match) {
        return parseFloat(match[1]); // 47.5
    }
    return Infinity; // fallback if we can't parse a number
}

export const findSemesterIdByCourseCode = (courseCode, updatedSemesters) => {
    for (const semesterId in updatedSemesters) {
        if (updatedSemesters[semesterId].includes(courseCode)) {
            return semesterId;
        }
    }
    return null;
};


export const areRequisitesMet = (courseCode, currentSemesterIndex, courseInstanceMap, allCourses, semesters, semesterCourses) => {
    const genericCode = courseInstanceMap[courseCode] || courseCode;
    const course = allCourses.find((c) => c._id === genericCode);

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

export const calculatedCreditsRequired = (coursePools) => {
    let totalCredits = 0;
    coursePools.forEach((pool) => {
        const maxCredits = parseMaxCreditsFromPoolName(pool.poolName);
        totalCredits += maxCredits;
        if (totalCredits > 120) {
            totalCredits = 120; // Cap at 120 credits
        }
    });
    return totalCredits;
};


export const calculateTotalCredits2 = (
    semesterCourses,
    semesters,
    coursePools,
    remainingCourses,
    courseInstanceMap,
    allCourses,
) => {
    let unmetPrereqFound = false;
    const poolCreditMap = {};

    // Initialize pool credits (excluding "option" pools)
    coursePools
        .filter((pool) => !pool.poolName.toLowerCase().includes("option"))
        .forEach((pool) => {
            poolCreditMap[pool.poolId] = {
                assigned: 0,
                max: parseMaxCreditsFromPoolName(pool.poolName),
            };
        });

    // Add fallback 'remaining' pool
    if (!poolCreditMap['remaining']) {
        poolCreditMap['remaining'] = { assigned: 0, max: Infinity };
    }

    for (const semesterId in semesterCourses) {
        if (semesterId.toLowerCase() === 'exempted') continue;

        const courseCodes = semesterCourses[semesterId];
        const currentSemesterIndex = semesters.findIndex((s) => s.id === semesterId);

        courseCodes.forEach((instanceId) => {
            const genericCode = courseInstanceMap[instanceId] || instanceId;

            const pool =
                coursePools.find((p) =>
                    p.courses.some((c) => c._id === genericCode)
                ) || { poolId: 'remaining', courses: remainingCourses || [] };

            const course =
                pool.courses.find((c) => c._id === genericCode) ||
                allCourses.find((c) => c._id === genericCode);

            if (!course) return;

            const credits = course.credits ?? 3;
            const prerequisitesMet = areRequisitesMet(genericCode, currentSemesterIndex, courseInstanceMap, allCourses, semesters, semesterCourses);
            if (!prerequisitesMet) unmetPrereqFound = true;

            if (!poolCreditMap[pool.poolId]) {
                poolCreditMap[pool.poolId] = { assigned: 0, max: Infinity };
            }

            const poolData = poolCreditMap[pool.poolId];
            poolData.assigned = Math.min(poolData.max, poolData.assigned + credits);
        });
    }

    const total = Object.values(poolCreditMap).reduce(
        (sum, poolData) => sum + poolData.assigned,
        0
    );

    return { total, unmetPrereqFound };


};

export function formatSemesters(sortedSemesters) {
    return sortedSemesters.map((term) => {
        const [season, year] = term.split(' ');

        let displayYear = year;
        if (season === 'Fall/Winter') {
            displayYear = `${year}-${(parseInt(year, 10) + 1) % 100}`;
        }
        return {
            id: term,
            name: `${season} ${displayYear}`,
        };
    });
}

export function generateSemesterCourses(sortedSemesters, semesterMap, courseInstanceMap = {}, uniqueIdCounter = 0) {
    const newSemesterCourses = {};
    let newUniqueCounter = uniqueIdCounter;
    const newCourseInstanceMap = { ...courseInstanceMap };

    sortedSemesters.forEach((term) => {
        const genericCodes = semesterMap[term] || [];

        // Ensure each course appears only once per semester
        const uniqueGenericCodes = Array.from(new Set(genericCodes));

        // Assign unique instance IDs for each course
        newSemesterCourses[term] = uniqueGenericCodes.map((code) => {
            const uniqueId = `${code}-${newUniqueCounter}`;
            newUniqueCounter++;
            newCourseInstanceMap[uniqueId] = code;
            return uniqueId;
        });
    });

    return {
        newSemesterCourses,
        newCourseInstanceMap,
        newUniqueCounter,
    };
}
export const buildTimelineState = (
    timelineData,
    state,
    startingSemester,
    extendedCredit,
) => {
    const timelineInfo = getTimelineInfo(timelineData, state.semesterCourses);

    const { nonExemptedData, parsedExemptedCourses, deficiency, extendedC } =
        parseCourses(timelineInfo, state.courseInstanceMap, state.allCourses, extendedCredit);

    const { semesterMap, semesterNames } = buildSemesterMap(
        nonExemptedData,
        parsedExemptedCourses,
        startingSemester
    );

    const sortedSemesters = sortSemesters(semesterNames);
    const formattedSemesters = formatSemesters(sortedSemesters);

    const { newSemesterCourses, newCourseInstanceMap, newUniqueCounter } =
        generateSemesterCourses(
            sortedSemesters,
            semesterMap,
            state.courseInstanceMap,
            state.uniqueIdCounter
        );

    return {
        formattedSemesters,
        newSemesterCourses,
        newCourseInstanceMap,
        newUniqueCounter,
        deficiency,
        extendedC,
    };
};

import { api } from '../api/http-api-client';
import * as Sentry from '@sentry/react';
import { notifySuccess, notifyError } from '../components/Toast';

export const SaveTimeline = async (tName, user, degree_Id, state, extendedCredit) => {

    const { user_id, timelineNameToSend, items, isExtended, exempted_courses, error } = buildTimelinePayload({
        tName,
        user,
        degree_Id,
        semesters: state.semesters,
        semesterCourses: state.semesterCourses,
        courseInstanceMap: state.courseInstanceMap,
        allCourses: state.allCourses,
        deficiencyCourses: state.deficiencyCourses,
        extendedCredit,
    });

    if (error) {
        return { error: error };
    }

    // try {
    await Promise.all([
        api.post(`/users/${user_id}/exemptions`, {
            coursecodes: exempted_courses,
        }),
        api.post("/timeline", {
            user_id,
            name: timelineNameToSend,
            items,
            degree_id: degree_Id,
            isExtendedCredit: isExtended,
        }),
    ]);
    return { error: null };
};


