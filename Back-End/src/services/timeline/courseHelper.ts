

import { CourseData, MinCoursesFromSetParams, RuleType } from "@trackmydegree/shared";

// Normalizes a course code by removing all whitespace,
// inserting a space between the letter prefix and numeric part, and converting it to uppercase.
// Example: " engr   201 " → "ENGR 201" or "ENGR201" -> "ENGR 201"
export function normalizeCourseCode(code: string): string {
  const compactCode = code.replaceAll(/\s+/g, ''); // Removes all whitespace
  const firstDigitIndex = compactCode.search(/\d/);

  if (firstDigitIndex <= 0) {
    return compactCode.toUpperCase();
  }

  // Inserts a space between the letter prefix and first numeric character.
  return `${compactCode.slice(0, firstDigitIndex)} ${compactCode.slice(firstDigitIndex)}`.toUpperCase();
}
export function isPlaceholderCourse(courseCode: string): boolean {
  return courseCode.includes("Elective") ||
    courseCode.includes("General") ||
    courseCode.includes("Technical") ||
    courseCode.includes("GEN ED") ||
    courseCode.includes("NATURAL SCIENCE");
}

export function getCoursesThatNeedCMinus(
  degreeName: string,
  requiredCourses: Set<string>,
  allCourses: Record<string, CourseData>,
) {
  //if degree is in gina cody and the course is a 200 level course
  const coursesThatNeedCMinus: Set<string> = new Set<string>();
  const name = degreeName.toLowerCase();
  if (!name.includes('engr') && !name.includes('comp'))
    return coursesThatNeedCMinus;

  const is200LevelCourse = (code: string) => {
    const match = /\b(\d{3})\b/.exec(code);
    return match?.[1].startsWith('2') ?? false;
  };

  for (const requiredCourse of requiredCourses) {
    const prereqList = allCourses[requiredCourse]?.rules?.filter(r => r.type === RuleType.Prerequisite);
    if (!prereqList) continue;
    for (const prereqs of prereqList) {
      //if course is a prereq for core courses
      const params = prereqs.params as MinCoursesFromSetParams;
      for (const prereq of params.courseList) {
        if (!requiredCourses.has(prereq) && is200LevelCourse(prereq)) continue; //only required 200-level courses need C-

        coursesThatNeedCMinus.add(prereq);
      }
    }
  }

  return coursesThatNeedCMinus;
}

export function validateGrade(minGrade: string, courseGrade?: string): boolean {
  //validates that a course received sufficent grade (for 200 core classes in gina cody at least C- is required)

  if (!courseGrade) return true; //if no grade is provided assume that either course is in progress or course is passed

  if (courseGrade.toUpperCase() == 'DISC') return false;

  if (courseGrade.toUpperCase() == 'EX') return true;

  const gradeValues: Record<string, number> = {
    'A+': 12,
    A: 11,
    'A-': 10,
    'B+': 9,
    B: 8,
    'B-': 7,
    'C+': 6,
    C: 5,
    'C-': 4,
    'D+': 3,
    D: 2,
    'D-': 1,
    F: 0,
  };

  const studentValue = gradeValues[courseGrade.toUpperCase()] ?? 0;
  const minValue = gradeValues[minGrade.toUpperCase()] ?? 0;

  return studentValue >= minValue;
}

export function addAllPrerequisitesAndCorequisitesToCourseArr(degreeCourses: CourseData[], allCourses: CourseData[]) {
  const coursesToAdd = new Set<CourseData>();
  const visited = new Set<string>();

  // Build a lookup map for quick access
  const courseMap = new Map<string, CourseData>();
  for (const course of allCourses) {
    courseMap.set(course._id, course);
  }

  // DFS to find all prerequisites and corequisites
  function dfs(courseCode: string) {
    if (visited.has(courseCode)) return;
    visited.add(courseCode);

    const course = courseMap.get(courseCode);
    if (!course) return;
    if (!Array.isArray(course.rules)){
      console.warn(`Course ${courseCode} has invalid rules format`);
      return;
    }
    for (const rule of course.rules) {
      if (rule.type === RuleType.Prerequisite || rule.type === RuleType.Corequisite) {
        const params = rule.params as MinCoursesFromSetParams;

        for (const prereq of params.courseList) {
          const prereqCourse = courseMap.get(prereq);
          if (prereqCourse) {
            coursesToAdd.add(prereqCourse);
            dfs(prereq);
          }
        }
      }
    }
  }

  // Start DFS from all degree courses
  for (const course of degreeCourses) {
    dfs(course._id);
  }

  // add all coursesToAdd to degreeCourses
  for (const course of coursesToAdd) {
    if (!degreeCourses.some(c => c._id === course._id)) {
      degreeCourses.push(course);
    }
  }
}