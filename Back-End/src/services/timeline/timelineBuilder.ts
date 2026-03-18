// services/buildTimeline.ts
import { parseFile } from '@services/parsingService';
import { ParsedData, ProgramInfo } from '../../types/transcript';
import { CourseData } from '@shared/degree';
import { Timeline } from '@models';
import { coursepoolController } from '@controllers/coursepoolController';
import { TimelineResult, TimelineCourse, TimelineDocument, TimelineSemester, CourseStatus } from '@shared/timeline';
import { DegreeData, CoursePoolInfo } from '@shared/degree';
import {  normalizeCourseCode } from './courseHelper';
import { processSemestersFromParsedData, generateEmptySemesters, generateSemestersFromPredefinedSequence } from './semesterBuilder';
import { mapCoursesToTimelineFormat } from './courseMapper';
import { getDegreeData, loadMissingCourses, getCourseData, getDegreeId } from './dataLoader';


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

export async function buildTimelineFromDB(
  timelineId: string,
): Promise<TimelineResult | undefined> {
  const timeline = await Timeline.findById(timelineId)
    .lean<TimelineDocument>()
    .exec();

  if (!timeline) {
    throw new Error('Timeline not found');
  }

   const result = await buildTimeline({
      type: 'timelineData',
      data: timeline,
  });

  if (result) {
      result.timelineName = timeline.name;
  }

  return result;
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
    await handleEcp(degreeId, coursePools, courses, degree);
  }
  if (programInfo.isCoop) {
    await handleCoop(degree, coursePools, courses);
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
  
  // If semesters are provided (either from parsed data or timeline data), we add any unused credits to the timeline.
  // This ensures that all courses taken by the student are accounted for, even if they are not part of the degree requirements.
  const semesters = semestersResults ?? parsedData?.semesters;
  if (semesters) addUnusedCredits(semesters, courses, coursePools);

  // If timeline is not loaded from database (semester data is provided), 
  // we need to build semestersResults by processing parsedData.semesters, 
  // or generating it from predefined sequence if requested by the user, or generating empty semesters
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
      semestersResults = generateEmptySemesters(
        programInfo.firstTerm,
        programInfo.lastTerm,
      );
    }
  } 

  // add deficiencies course pool (even if empty to keep UI consistent)
  addToCoursePools('deficiencies', deficiencies, courses, coursePools);

  // add exemptions to course completed and add an exemptions course pool
  addToCourseStatusMap(exemptions, courseStatusMap, 'completed');
  addToCoursePools('exemptions', exemptions, courses, coursePools, false);

  //transform courses obtained from db to the format expected by the frontend
  const courseResults: Record<string, TimelineCourse> = mapCoursesToTimelineFormat(courses, courseStatusMap);

  let timelineResult: TimelineResult = {
    degree: degree,
    pools: coursePools,
    courses: courseResults,
    semesters: semestersResults,
  };

  return timelineResult;
};



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

function addToCoursePools(
  coursePoolName: string,
  coursesToAdd: string[],
  allCourses: Record<string, CourseData>,
  coursePools: CoursePoolInfo[],
  calculateCredits: boolean = true,
) {
  const normalizedCourses = coursesToAdd.map(normalizeCourseCode);

  // calculate number of credits required and create a new coursePool
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


// Moved addEcpCoursePools outside buildTimeline for better testability
export async function handleEcp(
  degreeId: string,
  coursePools: CoursePoolInfo[],
  courses: Record<string, CourseData>,
  degree: DegreeData,
) {

  if (degree.ecpDegreeId) {
    const ecpResult = await getDegreeData(degree.ecpDegreeId);
    if (ecpResult) {

      // Merge "General Education and Humanities Electives"
      handle_general_education_electives(ecpResult, coursePools);
      // Then add the remaining ECP pools (if any) to the main coursePools array
      coursePools.push(...(ecpResult.coursePools || []));

      for (const course of Object.values(ecpResult.courses || {})) {
        courses[course._id] = course;
      }

      // If a degree object was passed in, increment its totalCredits by 30
      if (degree) {
        degree.totalCredits = (degree.totalCredits ?? 0) + 30;
      }
    }
  }
}
async function handle_general_education_electives(ecpResult: { coursePools: CoursePoolInfo[] }, coursePools: CoursePoolInfo[]) {
  const ecpPool = ecpResult.coursePools.find((pool) => pool.name.includes('General Education Humanities and Social Sciences Electives'));
  const gen_ed_pool_id = coursePools.find(pool => pool.name.includes('General Education Humanities and Social Sciences Electives'));
  if (ecpPool && gen_ed_pool_id) {
    for (const courseCode of ecpPool.courses) {
      if (!gen_ed_pool_id.courses.includes(courseCode)) {
        gen_ed_pool_id.courses.push(courseCode);
      }
    }
    gen_ed_pool_id.creditsRequired += ecpPool.creditsRequired;
    ecpResult.coursePools = ecpResult.coursePools.filter(pool => pool._id !== ecpPool._id); // Remove the merged pool from ecpResult
  }
}

async function handleCoop(
  degree: DegreeData,
  coursePools: CoursePoolInfo[],
  courses: Record<string, CourseData>,
) {
  const COOP_POOL_ID = "COOP_Co-op Work Terms";
  if (degree.coursePools && !degree.coursePools.includes(COOP_POOL_ID)) {
    degree.coursePools.push(COOP_POOL_ID);
  }
  if (coursePools.find((p) => p._id === COOP_POOL_ID)) {
    return;
  }
  const coopCoursePool = await coursepoolController.getCoursePool(COOP_POOL_ID)
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
    console.warn(`Co-op course pool with ID ${COOP_POOL_ID} not found, skipping.`);
  }
}

async function addUnusedCredits(semestersResults: Array<{ courses: Array<{ code: string }> }>,
  courses: Record<string, any>,
  coursePools: CoursePoolInfo[],
): Promise<void> {
  const unusedCreditCourses = []
  for (const semester of semestersResults) {
    for (const course of semester.courses) {
      const code = normalizeCourseCode(course.code);

      let courseD = courses[code];
      if (courseD) continue;

      // Course not part of degree → fetch its info
      courseD = await getCourseData(code);
      if (courseD) {
        courses[courseD._id] = courseD;
        unusedCreditCourses.push(code);
      }
      
    }
  }
  if (unusedCreditCourses.length > 0) addToCoursePools('unused credits', unusedCreditCourses, courses, coursePools, false);
}
