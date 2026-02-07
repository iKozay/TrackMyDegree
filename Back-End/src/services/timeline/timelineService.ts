// services/buildTimeline.ts
import { parseFile } from '@services/parsingService';
import { ParsedData, ProgramInfo, CourseStatus } from '../../types/transcript';
import {
  degreeController,
  CoursePoolInfo,
  DegreeData,
} from '@controllers/degreeController';
import { CourseData, courseController } from '@controllers/courseController';
import { SEASONS } from '@utils/constants';
import { Timeline } from '@models';
import { coursepoolController } from '@controllers/coursepoolController';

export interface TimelineResult {
  _id?: string;
  degree?: DegreeData;
  pools?: CoursePoolInfo[];
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  courses: Record<string, TimelineCourse>;
}

export interface TimelineCourse {
  id: string;
  title: string;
  credits: number;
  description?: string;
  offeredIN: string[];
  prerequisites: { anyOf: string[] }[];
  corequisites: { anyOf: string[] }[];
  status: {
    status: CourseStatus;
    semester: string | null;
  };
}

export interface TimelineSemester {
  term: string;
  courses: {
    code: string;
    message?: string;
  }[];
}
// Timeline as stored in DB
export interface TimelineDocument {
  _id?: string;
  userId: string;
  name: string;
  degreeId: string;
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  last_modified?: Date;
  courseStatusMap: Record<
    string,
    {
      status: CourseStatus;
      semester: string | null;
    }
  >; // only the minimal course status info
  exemptions: string[];
  deficiencies: string[];
}

// Timeline builder inputs
export type BuildTimelineParams =
  | { type: 'file'; data: Buffer } // uploaded transcript or acceptance letter
  | { type: 'form'; data: ProgramInfo } // frontend form input
  | { type: 'timelineData'; data: TimelineDocument }; // timeline object from database

async function getDataFromParams(params: BuildTimelineParams) {
  const { type, data } = params;
  let programInfo: ProgramInfo;
  let parsedData: ParsedData | undefined;
  let semestersResults: TimelineSemester[] | undefined;
  let courseStatusMap: Record<
    string,
    {
      status: CourseStatus;
      semester: string | null;
    }
  > = {};
  let exemptions: string[] = [];
  let deficiencies: string[] = [];
  switch (type) {
    case 'file':
      parsedData = await parseFile(data);
      if (!parsedData?.programInfo) throw new Error('Error parsing document');
      programInfo = parsedData.programInfo;
      deficiencies = parsedData.deficiencyCourses ?? [];
      exemptions = parsedData.exemptedCourses ?? [];
      break;
    case 'form':
      if (!data.degree)
        throw new Error('Form Data received does not contain a degree');
      programInfo = data;
      break;
    case 'timelineData':
      programInfo = {
        degree: data.degreeId,
        isCoop: data.isCoop,
        isExtendedCreditProgram: data.isExtendedCredit,
      };
      semestersResults = data.semesters;
      courseStatusMap = data.courseStatusMap;
      exemptions = data.exemptions ?? [];
      deficiencies = data.deficiencies ?? [];
      break;
    default:
      throw new Error('type not handled by timeline builder');
  }
  return {
    parsedData,
    programInfo,
    semestersResults,
    courseStatusMap,
    exemptions,
    deficiencies,
  };
}

export const buildTimeline = async (
  params: BuildTimelineParams,
): Promise<TimelineResult | undefined> => {
  let {
    parsedData,
    programInfo,
    semestersResults,
    courseStatusMap,
    exemptions,
    deficiencies,
  } = await getDataFromParams(params);
  let degreeId;

  //parsed degree does not always match the degree in the DB
  if (parsedData) degreeId = await getDegreeId(programInfo.degree);
  else degreeId = programInfo.degree;

  const result = await getDegreeData(degreeId);
  if (!result) throw new Error('Error fetching degree data from database');

  const { degreeData: degree, coursePools, courses } = result;

  if (programInfo.isExtendedCreditProgram) {
    await addEcpCoursePools(degreeId, coursePools, deficiencies);
  }
  if (programInfo.isCoop) {
    await addCoopCoursePool(degree, coursePools, courses);
  }

  // Load exemption and deficiency courses that are not part of the degree requirements.
  // This occurs when the timeline is loaded from the database ('timelineData' case) or when
  // parsing a transcript with exemptions/deficiencies for courses outside the degree program.
  await loadMissingCourses(exemptions, courses);
  await loadMissingCourses(deficiencies, courses);

  //add transfer credits to course completed
  addToCourseStatusMap(
    parsedData?.transferedCourses,
    courseStatusMap,
    'completed',
  );

  if (!semestersResults) {
    if (parsedData?.semesters) {
      semestersResults = await processSemestersFromParsedData(
        parsedData,
        degree,
        coursePools,
        courses,
        courseStatusMap,
      );
    } else if (programInfo.predefinedSequence) {
      semestersResults = await generateSemestersFromPredefinedSequence(
        programInfo.predefinedSequence,
        programInfo.firstTerm,
        courses,
        courseStatusMap,
      );
    } else {
      semestersResults = generateSemesters(
        programInfo.firstTerm,
        programInfo.lastTerm,
      );
    }
  } else {
    // If we already have semestersResults (e.g. from DB), ensure all courses are in pools
    await mapNonDegreeSemesterCoursesToUsedUnusedPool(
      semestersResults,
      courses,
      courseStatusMap,
      coursePools,
    );
  }

  // add deficiencies course pool (even if empty to keep UI consistent)
  addToCoursePools('deficiencies', deficiencies, courses, coursePools);

  // add exemptions to course completed and add an exemptions course pool
  addToCourseStatusMap(exemptions, courseStatusMap, 'completed');
  addToCoursePools('exemptions', exemptions, courses, coursePools, false);

  //transform courses obtained from db to the format expected by the frontend
  const courseResults: Record<string, TimelineCourse> = Object.fromEntries(
    Object.entries(courses).map(([code, course]) => {
      return [code, toTimelineCourse(course, courseStatusMap[code])];
    }),
  );

  let timelineResult: TimelineResult = {
    degree: degree,
    pools: coursePools,
    courses: courseResults,
    semesters: semestersResults,
  };

  return timelineResult;
};

function toTimelineCourse(
  course: CourseData,
  override?: { status: CourseStatus; semester: string | null },
): TimelineCourse {
  return {
    id: course._id,
    title: course.title,
    credits: course.credits,
    description: course.description,
    offeredIN: course.offeredIn ?? [],
    prerequisites: mapRequisites(course.rules?.prereq),
    corequisites: mapRequisites(course.rules?.coreq),
    status: {
      status: override?.status ?? 'incomplete',
      semester: override?.semester ?? null,
    },
  };
}

// Converts prerequisite/corequisite rules from the DB format
// (string[][] where each inner array represents an OR group)
// into the timeline format: [{ anyOf: string[] }]
function mapRequisites(reqs?: string[][]) {
  return (
    reqs?.map((group) => ({
      anyOf: group.map(normalizeCourseCode),
    })) ?? []
  );
}

async function processSemestersFromParsedData(
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

      let courseData = allCourses[normalizedCode];
      if (!courseData) {
        // Course not part of degree → fetch its info and mark it as not part of the degree
        courseData = await getCourseData(normalizedCode);
        if (courseData) allCourses[courseData._id] = courseData;
        coursesInfo.push({
          code: normalizedCode,
          message: 'Course not part of degree requirements',
        });
        courseStatusMap[normalizedCode] = { status: status, semester: term };

        addCourseToUsedUnusedPool(coursePools, normalizedCode);

        continue;
      }

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

function addToCoursePools(
  coursePoolName: string,
  coursesToAdd: string[],
  allCourses: Record<string, CourseData>,
  coursePools: CoursePoolInfo[],
  calculateCredits: boolean = true,
) {
  const normalizedCourses = coursesToAdd.map(normalizeCourseCode);

  // calculate number of credits required and create a new coursePool with the deficiency courses.
  let creditsRequired = 0;
  if (calculateCredits) {
    for (const courseId of normalizedCourses) {
      const course = allCourses[courseId];
      if (course) {
        creditsRequired += course.credits;
      }
    }
  }
  coursePools.push({
    _id: coursePoolName,
    name: coursePoolName,
    creditsRequired: creditsRequired,
    courses: normalizedCourses,
  });
}

function addToCourseStatusMap(
  coursesToAdd: string[] | undefined,
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
  status: CourseStatus,
  semester: string | null = null,
) {
  if (!coursesToAdd) return;
  for (const course of coursesToAdd) {
    courseStatusMap[normalizeCourseCode(course)] = {
      status: status,
      semester: semester,
    };
  }
}

async function getDegreeId(degreeName: string) {
  // We get all degree names from DB
  // We then remove first 2 words (like "BEng in") from them and
  // check if degree_name (received as function parameter) includes the resulting string
  // example:
  // degree name in DB: BEng in Computer Engineering
  // degree_name: Bachelor of Engineering Computer Engineering
  // We remove "BEng in" and check if the degree_name "contains Computer Engineering"
  //Beng in Software engineeering_ecp
  let degrees = await degreeController.readAllDegrees();
  let degreeId = degrees.find((d) =>
    degreeName
      .toLowerCase()
      .includes(d.name.split(' ').slice(2).join(' ').toLowerCase()),
  )?._id;
  if (!degreeId) throw new Error('Error fetching degree data from database');
  return degreeId;
}

async function getDegreeData(degreeId: string) {
  const [degreeData, coursePools, courseArr] = await Promise.all([
    degreeController.readDegree(degreeId),
    degreeController.getCoursePoolsForDegree(degreeId),
    degreeController.getCoursesForDegree(degreeId),
  ]);

  // Build dictionary
  const courses: Record<string, CourseData> = {};
  for (const c of courseArr) {
    courses[c._id] = c;
  }

  return { degreeData, coursePools, courses };
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

function getCoursesThatNeedCMinus(
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
    const prereqList = allCourses[requiredCourse]?.rules?.prereq;
    if (!prereqList) continue;
    for (const prereqs of prereqList) {
      //if course is a prereq for core courses
      for (const prereq of prereqs) {
        if (!requiredCourses.has(prereq) && is200LevelCourse(prereq)) continue; //only required 200-level courses need C-

        coursesThatNeedCMinus.add(prereq);
      }
    }
  }

  return coursesThatNeedCMinus;
}

// Normalizes a course code by removing all whitespace,
// inserting a space between the letter prefix and numeric part, and converting it to uppercase.
// Example: " engr   201 " → "ENGR 201" or "ENGR201" -> "ENGR 201"
export function normalizeCourseCode(code: string): string {
  return code
    .replaceAll(/\s+/g, '') //Removes all whitespace
    .replace(/([a-zA-Z]+)(\d+)/, '$1 $2') //Inserts a space between letters and numbers
    .toUpperCase();
}

function validateGrade(minGrade: string, courseGrade?: string): boolean {
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

async function loadMissingCourses(
  coursesToAdd: string[],
  degreeCourses: Record<string, CourseData>,
) {
  for (const courseCode of coursesToAdd) {
    const normalizedCode = normalizeCourseCode(courseCode);
    if (!degreeCourses[normalizedCode]) {
      const courseData: CourseData = await getCourseData(normalizedCode);
      if (!courseData) continue;
      degreeCourses[courseData._id] = courseData;
    }
  }
}

async function getCourseData(courseCode: string) {
  try {
    return await courseController.getCourseByCode(courseCode);
  } catch {
    // Courses not in the database are handled gracefully by callers,
    // which skip adding them to the degree course list.
    console.warn(`Course not found in database: ${courseCode}`);
    return null;
  }
}

import { PredefinedSequenceTerm } from "../../types/transcript";
import {getTermRanges} from "@utils/misc";

async function generateSemestersFromPredefinedSequence(
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

function isPlaceholderCourse(courseCode: string): boolean {
  return courseCode.includes("Elective") ||
    courseCode.includes("General") ||
    courseCode.includes("Technical") ||
    courseCode.includes("GEN ED") ||
    courseCode.includes("NATURAL SCIENCE");
}

function isPlanned(currentTerm: string) {
  const today = new Date();
  const { end } = getTermRanges(currentTerm);

  return today <= end; //if the term didnt start yet, courses included in it are planned
}

function generateSemesters(startTerm?: string, endTerm?: string) {
  const results: TimelineSemester[] = [];
  let terms = generateTerms(startTerm, endTerm);
  for (const term of terms) {
    results.push({ term: term, courses: [] });
  }
  return results;
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

export async function buildTimelineFromDB(
  timelineId: string,
): Promise<TimelineResult | undefined> {
  const timeline = await Timeline.findById(timelineId)
    .lean<TimelineDocument>()
    .exec();

  if (!timeline) {
    throw new Error('Timeline not found');
  }

  return buildTimeline({
    type: 'timelineData',
    data: timeline,
  });
}

export function addCourseToUsedUnusedPool(
  pools: CoursePoolInfo[],
  courseCode: string,
): void {
  const USED_UNUSED_POOL_ID = 'used-unused-credits';
  const USED_UNUSED_POOL_NAME = 'Used/Unused credits';

  let pool = pools.find((p) => p._id === USED_UNUSED_POOL_ID);
  if (!pool) {
    pool = {
      _id: USED_UNUSED_POOL_ID,
      name: USED_UNUSED_POOL_NAME,
      creditsRequired: 0,
      courses: [],
    };
    pools.push(pool);
  }

  if (!pool.courses.includes(courseCode)) {
    pool.courses.push(courseCode);
  }
}
// Moved addEcpCoursePools outside buildTimeline for better testability
export async function addEcpCoursePools(
  degreeId: string,
  coursePools: CoursePoolInfo[],
  deficiencies: string[],
) {
  const ecpMapping: Record<string, string> = {
    BEng: 'ENGR_ECP',
    BCompSc: 'COMP_ECP',
  };

  const ecpKey = Object.keys(ecpMapping).find((key) => degreeId.includes(key));
  if (ecpKey) {
    const ecpResult = await getDegreeData(ecpMapping[ecpKey]);
    if (ecpResult) {
      coursePools.push(...ecpResult.coursePools);
      deficiencies.push(...ecpResult.coursePools.map((pool) => pool.name));
    }
  }
}
async function addCoopCoursePool(
  degree: DegreeData,
  coursePools: CoursePoolInfo[],
  courses: Record<string, CourseData>,
) {
  if (degree.coursePools) {
    degree.coursePools.push("Coop Courses");
    console.log("added coop to degree course pools")
  }
  const coopCoursePool = await coursepoolController.getCoursePool("Coop Courses")
  if (coopCoursePool) {
    const coopCoursesList = coopCoursePool.courses || [];
    const coopCourses = await Promise.all(coopCoursesList.map(async (code) => await getCourseData(code)));
    coursePools.push(coopCoursePool as CoursePoolInfo);
    for (const c of coopCourses) {
      if (c) {
        courses[c._id] = c;
      }
    }
  } else {
    console.warn("Coop Courses pool not found, skipping.");
  }
}

/**
 * Ensures that any semester course not found in `courses` (degree courses map) is:
 *  - fetched from DB,
 *  - added to `courses`,
 *  - kept/initialized in `courseStatusMap`,
 *  - and pushed into the Used/Unused credits pool.
 * Mutates: `courses`, `courseStatusMap`, `coursePools`
 */
export async function mapNonDegreeSemesterCoursesToUsedUnusedPool(
  semestersResults: Array<{ courses: Array<{ code: string }> }>,
  courses: Record<string, any>, // your DB course map (keyed by course code OR _id depending on your existing structure)
  courseStatusMap: Record<string, { status?: any; semester?: any }>,
  coursePools: CoursePoolInfo[],
): Promise<void> {
  for (const semester of semestersResults) {
    for (const course of semester.courses) {
      const code = normalizeCourseCode(course.code);

      let courseD = courses[code];
      if (courseD) continue;

      // Course not part of degree → fetch its info
      courseD = await getCourseData(code);
      if (courseD) {
        // Keep the same insertion pattern you already use in your codebase
        courses[courseD._id] = courseD;
      }
      addCourseToUsedUnusedPool(coursePools, code);
    }
  }
}
