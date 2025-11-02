// // Helper: find position of a semester label (e.g., "FALL 2026") in the semesters array
//     function semesterPos(semesters, label) {
//         if (!Array.isArray(semesters) || !label) return -1;
//         return semesters.findIndex(obj => obj && Object.prototype.hasOwnProperty.call(obj, label));
//     }

//     /**
//      * Validate prerequisites for placing a course in `semesterId`.
//      * A group (AND between groups) is satisfied if ANY of its options is:
//      *  - status === 'completed', or
//      *  - status in ['planned','inprogress'] and its semester is strictly BEFORE `semesterId`
//      *
//      * @param {Array} prerequisites   - [{ anyOf: [code, ...] }, ...]
//      * @param {String} semesterId     - target semester label, e.g., "FALL 2026"
//      * @returns {{valid: boolean, reason?: string}}
//      */
//     function validatePrerequisites(prerequisites, semesterId) {
//         if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
//             return { valid: true };
//         }

//         const targetPos = semesterPos(semesters, semesterId);

//         // check if a single option satisfies the condition
//         const optionSatisfied = (code) => {
//             const c = courses?.[code];
//             const status = c?.status?.status;
//             const when = c?.status?.semester;

//             if (status === "completed") return true;

//             if (status === "planned" || status === "inprogress") {
//                 const pos = semesterPos(semesters, when);
//                 if (pos !== -1 && targetPos !== -1) {
//                     return pos < targetPos; // must be strictly before target
//                 }
//                 // if we can't place the planned semester on the timeline, treat as NOT satisfied
//                 return false;
//             }
//             // incomplete / unknown / missing -> not satisfied
//             return false;
//         };

//         const unmetGroups = [];

//         for (const g of prerequisites) {
//             const options = Array.isArray(g?.anyOf) ? g.anyOf : [];
//             // Calls optionSatisfied with each code
//             const groupOK = options.some(optionSatisfied);

//             if (!groupOK) {
//                 // Build a readable group string like "(A OR B)"
//                 const label = options.length ? `(${options.join(" OR ")})` : "(unspecified)";
//                 unmetGroups.push(label);
//             }
//         }

//         if (unmetGroups.length === 0) {
//             return { valid: true };
//         }

//         return {
//             valid: false,
//             reason: `Prerequisites are not met: ${unmetGroups.join(" AND ")}`
//         };
//     }

// Example:
// const ok = validatePrerequisites(courses, course.prerequisites, "FALL 2026", semesters);

// const validateCourseForSemester = (courseCode, semesterId) => {
//     const course = courses[courseCode];

//     // is is available
//     // if (!course.offeredIN.includes(semesterId)) {
//     //     return { valid: false, reason: `Not offered in ${semesterId}` };
//     // }
//     // // check prerequiaites
//     // const prereqvalidation = validatePrerequisites(course.prerequisites, semesterId);
//     // if (!prereqvalidation.valid) {
//     //     return prereqvalidation;
//     // }



//     // if (course.prereq) {
//     //     const unmetPrereqs = course.prereq.filter(prereq => {
//     //         const prereqCourse = courses[prereq];
//     //         const status = prereqCourse?.status?.status;
//     //         return status !== 'completed' && status !== 'inprogress';
//     //     });
//     //     if (unmetPrereqs.length > 0) {
//     //         return { valid: false, reason: `Missing prerequisites: ${unmetPrereqs.join(', ')}` };
//     //     }
//     // }

//     return { valid: true };
// };

// const addDeficiency = () => {
//     const courseCode = prompt('Enter deficiency course code:');
//     if (courseCode) {
//         setCourses(prev => ({
//             ...prev,
//             [courseCode]: {
//                 id: courseCode,
//                 name: 'Deficiency Course',
//                 credits: 0,
//                 available: ['FALL', 'WINTER', 'SUMMER'],
//                 prereq: null,
//                 corereq: null,
//                 status: { status: 'incomplete', semester: null }
//             }
//         }));

//         setPools(prev => ({
//             ...prev,
//             deficiency: {
//                 ...prev.deficiency,
//                 courseIds: [...prev.deficiency.courseIds, courseCode]
//             }
//         }));
//     }
// };

// const addExemption = () => {
//     const courseCode = prompt('Enter exemption course code:');
//     if (courseCode && courses[courseCode]) {
//         setCourses(prev => ({
//             ...prev,
//             [courseCode]: {
//                 ...prev[courseCode],
//                 status: { status: 'exempted', semester: null }
//             }
//         }));

//         setPools(prev => ({
//             ...prev,
//             exemption: {
//                 ...prev.exemption,
//                 courseIds: [...prev.exemption.courseIds, courseCode]
//             }
//         }));
//     }
// };

// const removeCourseFromSemester = (courseCode, semesterId) => {
//     setSemesters(prev =>
//         prev.map(entry => {
//             const key = Object.keys(entry)[0];           // e.g., "FALL 2025"
//             if (key !== semesterId) return entry;
//             const list = Array.isArray(entry[key]) ? entry[key] : [];
//             return { [key]: list.filter(id => id !== courseCode) };
//         })
//     );

//     setCourses(prev => ({
//         ...prev,
//         [courseCode]: {
//             ...prev[courseCode],
//             status: { status: 'incomplete', semester: null }
//         }
//     }));
// };

// const addSemester = () => {
//     const season = prompt('Enter season (FALL/WINTER/SUMMER):');
//     const year = prompt('Enter year (e.g., 2027):');
//     if (season && year) {
//         const semesterId = `${season.toUpperCase()} ${year}`;
//         const exist = semesters.some(obj => Object.prototype.hasOwnProperty.call(obj, semesterId));
//         if (!exist) {
//             setSemesters(prev => {
//                 return exist ? prev : [...prev, { [semesterId]: [] }];
//             });
//         }
//         else {
//             alert("semester already exist")
//         }

//     }
// };

// const saveData = () => {
//     const dataToSave = {
//         pools,
//         courses,
//         semesters
//     };

//     const dataStr = JSON.stringify(dataToSave, null, 2);
//     const dataBlob = new Blob([dataStr], { type: 'application/json' });
//     const url = URL.createObjectURL(dataBlob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = 'stude-timeline-data.json';
//     link.click();
//     URL.revokeObjectURL(url);
// };

// if (status === "loading" || status === "processing")
//     return <h2>⏳ Loading timeline...</h2>;

// if (status === "error")
//     return <h2>❌ Could not load timeline data.</h2>;
