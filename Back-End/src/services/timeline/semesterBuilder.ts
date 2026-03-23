import { unlink } from 'node:fs/promises';
import { PredefinedSequenceTerm, ParsedData } from '../../types/transcript';
import { CourseData } from '@shared/degree';
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
      let courseNotPartOfDegree = unusedCourses.includes(normalizedCode);
      let { status, message } = getCourseStatus(
        term,
        parsedData?.programInfo?.isCoop,
        normalizedCode,
        coursesThatNeedCMinus,
        course.grade,
        courseNotPartOfDegree,
      );
     
      coursesInfo.push({ code: normalizedCode, message: message });

      // Update course status in the map, but only if it's not already marked as completed (to handle retaken courses)
      const existing = courseStatusMap[normalizedCode];
      if (existing?.status !== 'completed') {
        courseStatusMap[normalizedCode] = { status: status, semester: term };
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
  courseNotPartOfDegree: boolean = false,
) {
  let status: CourseStatus = 'incomplete';
  let message;

  if (courseNotPartOfDegree) {
    status = 'completed'; // We mark it as completed to avoid showing it as an incomplete course, but we add a message to indicate that it's not part of degree requirements
    message = 'Course not part of degree requirements';
  }
  else if (courseGrade?.toUpperCase() === 'DISC') message = 'DISC';
  else if (isPlanned(term)) status = 'planned';
  else if (isCoop && courseCode.toUpperCase().includes('CWT')) {
    if (courseGrade?.toUpperCase() == 'PASS') status = 'completed';
  } 
  else {
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

  // Post-process: merge capstone (XXX 490) courses that appear in consecutive
  // FALL and WINTER semesters into a single FALL/WINTER semester, matching the
  // behaviour of the transcript-based timeline.
  return mergeCapstoneSemesters(results, courseStatusMap);
}

/**
 * Attempts to merge a capstone course (code ending in " 490") from a consecutive
 * FALL + WINTER semester pair at position `i` into a single "FALL/WINTER YYYY-YYYY+1"
 * semester.  Returns the replacement semesters and the number of original entries
 * consumed, or null if no merge is applicable.
 */
function tryMergeCapstoneAtIndex(
  semesters: TimelineSemester[],
  i: number,
  courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>
): { merged: TimelineSemester[]; consumed: number } | null {
  const current = semesters[i];
  const next = semesters[i + 1];

  if (!next) return null;
  if (!current.term.startsWith(`${SEASONS.FALL} `)) return null;
  if (!next.term.startsWith(`${SEASONS.WINTER} `)) return null;

  const fallCapstones = current.courses.filter(c => c.code.endsWith(' 490'));
  const winterCapstones = next.courses.filter(c => c.code.endsWith(' 490'));

  if (fallCapstones.length === 0 || winterCapstones.length === 0) return null;

  const fallYear = Number.parseInt(current.term.split(' ')[1]);
  const winterYear = Number.parseInt(next.term.split(' ')[1]);
  const fallWinterLabel = `${SEASONS.FALL_WINTER} ${fallYear}-${winterYear}`;

  // Take the capstone entry from the fall semester (same course code in both terms)
  const capstoneCourse = fallCapstones[0];

  // Reassign the capstone to the merged Fall/Winter period in the status map
  courseStatusMap[capstoneCourse.code] = {
    status: courseStatusMap[capstoneCourse.code]?.status ?? 'planned',
    semester: fallWinterLabel,
  };

  const merged: TimelineSemester[] = [];
  const fallWithout = current.courses.filter(c => !c.code.endsWith(' 490'));
  const winterWithout = next.courses.filter(c => !c.code.endsWith(' 490'));

  if (fallWithout.length > 0) merged.push({ term: current.term, courses: fallWithout });
  merged.push({ term: fallWinterLabel, courses: [capstoneCourse] });
  if (winterWithout.length > 0) merged.push({ term: next.term, courses: winterWithout });

  return { merged, consumed: 2 };
}

/**
 * Scans the semester list for consecutive FALL + WINTER pairs that both contain
 * a capstone course (code ending in " 490").  When found, the capstone is
 * removed from each individual semester and placed in a new "FALL/WINTER YYYY-YYYY+1"
 * semester inserted between them.  Semesters that become empty after removal are dropped.
 */
function mergeCapstoneSemesters(
  semesters: TimelineSemester[],
  courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>
): TimelineSemester[] {
  const result: TimelineSemester[] = [];
  let i = 0;

  while (i < semesters.length) {
    const mergeResult = tryMergeCapstoneAtIndex(semesters, i, courseStatusMap);
    if (mergeResult) {
      result.push(...mergeResult.merged);
      i += mergeResult.consumed;
    } else {
      result.push(semesters[i]);
      i++;
    }
  }

  return result;
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
