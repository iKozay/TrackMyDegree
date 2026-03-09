import { PredefinedSequenceTerm, ParsedData } from '../../types/transcript';
import { CourseData } from '@controllers/courseController';
import { SEASONS } from '@utils/constants';
import {getTermRanges} from "@utils/misc";
import { TimelineSemester, CourseStatus } from '@shared/timeline';
import { DegreeData, CoursePoolInfo } from '@shared/degree';
import { getCoursesThatNeedCMinus, isPlaceholderCourse, normalizeCourseCode, validateGrade } from './courseHelper';
import { getCourseData } from './dataLoader';

export async function processSemestersFromParsedData(
  parsedData: ParsedData,
  degree: DegreeData,
  coursePools: CoursePoolInfo[],
  allCourses: Record<string, CourseData>,
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
) {
  if (!parsedData.semesters) return [];

  let requiredCourses = getRequiredCourses(coursePools);
  let coursesThatNeedCMinus: Set<string> = getCoursesThatNeedCMinus(
    degree.name,
    requiredCourses,
    allCourses,
  );
  let semesters_results = [];
  const unusedCourses = coursePools.find((pool) => pool.name === 'unused credits')?.courses ?? [];

  for (const semester of parsedData.semesters) {
    let term = semester.term.toUpperCase();
    let coursesInfo = [];
    for (const course of semester.courses) {
      //get course status
      let normalizedCode = normalizeCourseCode(course.code);

      let { status, message } = getCourseStatus(
        term,
        parsedData?.programInfo?.isCoop,
        normalizedCode,
        coursesThatNeedCMinus,
        course.grade,
      );
      if( unusedCourses.includes(normalizedCode)) {
        message = "Course not part of degree requirements";
        status = "completed";
        coursesInfo.push({
          code: normalizedCode,
          message: 'Course not part of degree requirements',
        });
        courseStatusMap[normalizedCode] = { status: status, semester: term };
        continue;
      }

      let courseData = allCourses[normalizedCode];
      let courseCode = courseData._id;
      coursesInfo.push({ code: courseCode, message: message });
      const existing = courseStatusMap[courseCode];
      if (existing?.status !== 'completed') {
        //course can be taken two times
        courseStatusMap[courseCode] = { status: status, semester: term };
      }
    }
    semesters_results.push({ term: term, courses: coursesInfo });
  }
  return semesters_results;
}

function getCourseStatus(
  term: string,
  isCoop: boolean | undefined,
  courseCode: string,
  coursesThatNeedCMinus: Set<string>,
  courseGrade?: string,
) {
  let status: CourseStatus = 'incomplete';
  let message;
  if (courseGrade?.toUpperCase() === 'DISC') message = 'DISC';
  else if (isPlanned(term)) status = 'planned';
  else if (isCoop && courseCode.toUpperCase().includes('CWT')) {
    if (courseGrade?.toUpperCase() == 'PASS') status = 'completed';
  } else {
    let minGrade = 'D-';
    if (coursesThatNeedCMinus.has(courseCode)) minGrade = 'C-';
    let satisfactoryGrade = validateGrade(minGrade, courseGrade);
    if (satisfactoryGrade) {
      status = 'completed';
    } else {
      message = `Minimum grade not met: ${minGrade} is needed to pass this course.`;
    }
  }
  return { status, message };
}


function getRequiredCourses(coursePools: CoursePoolInfo[]) {
  const requiredCourses: Set<string> = new Set<string>();
  for (const pool of coursePools) {
    if (!pool.name.toLowerCase().includes('elective')) {
      //core courses
      for (const courseCode of pool.courses) {
        requiredCourses.add(courseCode);
      }
    }
  }
  return requiredCourses;
}


export async function generateSemestersFromPredefinedSequence(
  predefinedSequence: PredefinedSequenceTerm[],
  startTerm: string | undefined,
  courses: Record<string, CourseData>,
  courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>
): Promise<TimelineSemester[]> {
  const results: TimelineSemester[] = [];
  const terms = [SEASONS.WINTER, SEASONS.SUMMER, SEASONS.FALL];

  let { startYear, currentSeasonIndex } = parseStartTerm(startTerm, terms);

  for (const sequenceTerm of predefinedSequence) {
    const termLabel = `${terms[currentSeasonIndex]} ${startYear}`;
    let coursesInfo: { code: string; message?: string }[] = [];

    if (sequenceTerm.type === "Academic" && sequenceTerm.courses) {
      coursesInfo = await processPredefinedCourses(sequenceTerm.courses, termLabel, courses, courseStatusMap);
    } else if (sequenceTerm.type === "Co-op") {
      coursesInfo.push({
        code: sequenceTerm.coopLabel || "Co-op Work Term",
        message: "Co-op Work Term"
      });
    }

    results.push({ term: termLabel, courses: coursesInfo });

    // Move to next term
    currentSeasonIndex++;
    if (currentSeasonIndex === terms.length) {
      currentSeasonIndex = 0;
      startYear++;
    }
  }

  return results;
}

function parseStartTerm(startTerm: string | undefined, terms: string[]) {
  if (startTerm) {
    const parsedStartYear = Number.parseInt(startTerm.split(' ')[1]);
    const startSeason = startTerm.split(' ')[0].toUpperCase();
    let currentSeasonIndex = terms.indexOf(startSeason);
    if (currentSeasonIndex === -1) currentSeasonIndex = 2; // Default to Fall
    return { startYear: parsedStartYear, currentSeasonIndex };
  }
  return { startYear: new Date().getFullYear(), currentSeasonIndex: 2 }; // Fall
}

async function processPredefinedCourses(
  courseCodes: string[],
  termLabel: string,
  courses: Record<string, CourseData>,
  courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>
): Promise<{ code: string; message?: string }[]> {
  const coursesInfo: { code: string; message?: string }[] = [];

  for (const courseCode of courseCodes) {
    const normalizedCode = normalizeCourseCode(courseCode);

    if (isPlaceholderCourse(courseCode)) {
      coursesInfo.push({ code: courseCode, message: "Placeholder - select a course" });
      continue;
    }

    if (!courses[normalizedCode]) {
      const courseData = await getCourseData(normalizedCode);
      if (courseData) {
        courses[courseData._id] = courseData;
      }
    }

    if (courses[normalizedCode]) {
      coursesInfo.push({ code: normalizedCode });
      courseStatusMap[normalizedCode] = { status: "planned", semester: termLabel };
    } else {
      coursesInfo.push({ code: normalizedCode, message: "Course not found in database" });
    }
  }
  return coursesInfo;
}



export function generateEmptySemesters(startTerm?: string, endTerm?: string) {
  const results: TimelineSemester[] = [];
  let terms = generateTerms(startTerm, endTerm);
  for (const term of terms) {
    results.push({ term: term, courses: [] });
  }
  return results;
}
function isPlanned(currentTerm: string) {
  const today = new Date();
  const { end } = getTermRanges(currentTerm);

  return today <= end; //if the term didnt start yet, courses included in it are planned
}


function generateTerms(startTerm?: string, endTerm?: string) {
  if (!startTerm) {
    // This shouldn't trigger but if does we use a default starting term
    const currentYear = new Date().getFullYear();
    startTerm = `${SEASONS.FALL} ${currentYear - 4}`;
  }
  const terms = [SEASONS.WINTER, SEASONS.SUMMER, SEASONS.FALL];
  const startYear = Number.parseInt(startTerm.split(' ')[1]); // Extracting the year
  const startSeason = startTerm.split(' ')[0].toUpperCase(); // Extracting the season
  let endYear, endSeason;
  if (endTerm) {
    endYear = Number.parseInt(endTerm.split(' ')[1]); // Extracting the year
    endSeason = endTerm.split(' ')[0].toUpperCase(); // Extracting the season
  } else {
    endYear = startYear + 3;
    endSeason = startSeason;
  }

  const resultTerms = [];

  let currentYear = startYear;
  let currentSeasonIndex = terms.indexOf(startSeason); // Find index of start season in the list

  // Loop to generate all terms from start to end
  while (
    currentYear < endYear ||
    (currentYear === endYear && currentSeasonIndex <= terms.indexOf(endSeason))
  ) {
    const term = `${terms[currentSeasonIndex]} ${currentYear}`;
    resultTerms.push(term);

    // Move to the next season
    currentSeasonIndex++;

    if (currentSeasonIndex === terms.length) {
      currentSeasonIndex = 0;
      currentYear++;
    }
  }
  // console.log("terms:", resultTerms)
  return resultTerms;
}
