import { Timeline, User, Degree, Course } from '@models';
import { degreeController } from '@controllers/degreeController';
import { normalizeAcademicYear } from '@services/catalogVersionService';
import {
  DegreeAuditData,
  StudentInfo,
  ProgressStats,
  Notice,
  RequirementCategory,
  AuditCourse,
  CourseAuditStatus,
  RequirementStatus,
  GenerateAuditParams,
  TimelineCourse, TimelineDocument, TimelineResult, TimelineSemester, CourseStatus,
  CourseData, DegreeData, CoursePoolData } from '@trackmydegree/shared';
import { getTermRanges, isTermInProgress } from '@utils/misc';

interface TimelineWithUser extends TimelineDocument {
  userId: string;
}

/**
 * Maps internal course status to audit display status
 * If a course is marked as 'planned' but is in the current term,
 * it should be treated as 'In Progress' for graduation calculation purposes.
 */
function mapCourseStatus(
  status: CourseStatus,
  term?: string | null,
): CourseAuditStatus {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'inprogress':
      // eslint-disable-next-line sonarjs/no-duplicate-string
      return 'In Progress';
    case 'planned':
      if (term && isTermInProgress(term)) {
        return 'In Progress';
      }
      // eslint-disable-next-line sonarjs/no-duplicate-string
      return 'Not Started';
    case 'incomplete':
    default:
      return 'Missing';
  }
}

/**
 * Determines the status of a requirement category based on its courses
 */
function determineRequirementStatus(
  creditsCompleted: number,
  creditsInProgress: number,
  creditsTotal: number,
): RequirementStatus {
  if (creditsCompleted >= creditsTotal) {
    return 'Complete';
  }
  if (creditsCompleted + creditsInProgress >= creditsTotal) {
    return 'In Progress';
  }
  if (creditsCompleted > 0 || creditsInProgress > 0) {
    return 'Incomplete';
  }
  return 'Not Started';
}

/**
 * Generates notices based on audit analysis
 */
function generateNotices(
  requirements: RequirementCategory[],
  progress: ProgressStats,
): Notice[] {
  const notices: Notice[] = [];
  let noticeId = 1;

  // Check for missing requirements
  for (const req of requirements) {
    const missingCredits = req.creditsTotal - req.creditsCompleted;
    if (missingCredits > 0 && req.status !== 'Complete') {
      const coursesInProgress = req.courses.filter(
        (c) => c.status === 'In Progress',
      ).length;

      if (req.status === 'Not Started') {
        notices.push({
          id: `notice-${noticeId++}`,
          type: 'warning',
          message: `${req.title} requirements not yet started (${req.creditsTotal} credits needed)`,
        });
      } else if (coursesInProgress === 0 && missingCredits > 0) {
        notices.push({
          id: `notice-${noticeId++}`,
          type: 'warning',
          message: `${missingCredits} credits remaining in ${req.title} requirements`,
        });
      }
    }
  }

  // Check for capstone project requirements
  const capstoneReq = requirements.find((r) =>
    r.title.toLowerCase().includes('capstone'),
  );
  if (
    capstoneReq &&
    capstoneReq.status !== 'Complete' &&
    capstoneReq.status !== 'In Progress'
  ) {
    notices.push({
      id: `notice-${noticeId++}`,
      type: 'warning',
      message: 'Capstone project must be completed before graduation',
    });
  }

  // Progress-based notices
  if (progress.percentage >= 75) {
    notices.push({
      id: `notice-${noticeId++}`,
      type: 'success',
      message: 'Great progress! You are approaching degree completion',
    });
  } else if (progress.percentage >= 50) {
    notices.push({
      id: `notice-${noticeId++}`,
      type: 'info',
      message: 'You have completed more than half of your degree requirements',
    });
  }

  // Check for deficiencies
  const deficiencyReq = requirements.find((r) => r.id === 'deficiencies');
  if (
    deficiencyReq &&
    deficiencyReq.creditsTotal > 0 &&
    deficiencyReq.status !== 'Complete'
  ) {
    notices.push({
      id: `notice-${noticeId++}`,
      type: 'warning',
      message: `You have ${deficiencyReq.creditsTotal - deficiencyReq.creditsCompleted} credits of deficiency courses to complete`,
    });
  }

  return notices;
}

/**
 * Processes a course pool into a requirement category
 */
function processPoolToRequirement(
  pool: CoursePoolData,
  allCourses: Record<string, CourseData>,
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
): RequirementCategory {
  const auditCourses: AuditCourse[] = [];
  let creditsCompleted = 0;
  let creditsInProgress = 0;

  for (const courseCode of pool.courses) {
    const courseData = allCourses[courseCode];
    if (!courseData) continue;

    const statusInfo = courseStatusMap[courseCode];
    const status = statusInfo
      ? mapCourseStatus(statusInfo.status, statusInfo.semester)
      : 'Missing';
    const credits = courseData.credits || 0;

    if (status === 'Completed') {
      creditsCompleted += credits;
    } else if (status === 'In Progress') {
      creditsInProgress += credits;
    }

    auditCourses.push({
      id: `course-${courseCode.replaceAll(/\s+/g, '-')}`,
      code: courseCode,
      title: courseData.title || 'Unknown Course',
      credits,
      status,
      term: statusInfo?.semester || undefined,
    });
  }

  // Sort courses: Completed first, then In Progress, then Missing
  auditCourses.sort((a, b) => {
    const order = {
      Completed: 0,
      'In Progress': 1,
      'Not Started': 2,
      Missing: 3,
    };
    return order[a.status] - order[b.status];
  });

  const creditsTotal = pool.creditsRequired || 0;
  const reqStatus = determineRequirementStatus(
    creditsCompleted,
    creditsInProgress,
    creditsTotal,
  );

  // Format pool name for display
  let displayName = pool.name;
  if (displayName) {
    // Capitalize first letter of each word
    displayName = displayName
      .split(/[\s_-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return {
    id: `req-${pool._id.replaceAll(/\s+/g, '-')}`,
    title: displayName || 'Unknown Requirement',
    status: reqStatus,
    creditsCompleted,
    creditsTotal,
    courses: auditCourses,
  };
}

const CREDITS_PER_TERM = 15;

/**
 * Estimates expected graduation assuming 30 credits per academic year
 * (Fall + Winter only, no summer enrolment).
 */
export function estimateGraduation(
  remainingCredits: number,
  referenceDate: Date = new Date(),
): string {
  const month = referenceDate.getMonth();
  let year = referenceDate.getFullYear();

  // Start from the current or next active term (skip summer)
  let isFall: boolean;
  if (month <= 4) {
    isFall = false; // Winter term (Jan–May)
  } else if (month <= 7) {
    isFall = true; // Summer → next active is Fall
  } else {
    isFall = true; // Fall term (Sep–Dec)
  }

  if (remainingCredits <= 0) {
    return `${isFall ? 'Fall' : 'Winter'} ${year}`;
  }

  const termsRemaining = Math.ceil(remainingCredits / CREDITS_PER_TERM);

  for (let i = 1; i < termsRemaining; i++) {
    if (isFall) {
      year++;
      isFall = false; // Fall → Winter of next calendar year
    } else {
      isFall = true; // Winter → Fall of same calendar year
    }
  }

  return `${isFall ? 'Fall' : 'Winter'} ${year}`;
}

/**
 * Maps a graduation term string (e.g. "Winter 2026") to the academic year
 * that governs the curriculum (e.g. "2025-2026").
 *
 *   Fall  YYYY  → YYYY-(YYYY+1)
 *   Summer YYYY → YYYY-(YYYY+1)
 *   Winter YYYY → (YYYY-1)-YYYY
 */
export function graduationTermToAcademicYear(graduationTerm: string): string {
  const [term, yearStr] = graduationTerm.toLowerCase().split(' ');
  const year = Number.parseInt(yearStr, 10);

  if (term === 'fall' || term === 'summer') {
    return `${year}-${year + 1}`;
  }
  // Winter
  return `${year - 1}-${year}`;
}

interface TimelineEstimation {
  academicYear: string;
  expectedGraduation: string;
}

/**
 * Finds the first active semester from the timeline or course status map.
 * Used to determine the starting academic year for degree requirements.
 */
function getFirstActiveTerm(
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
  semesters?: TimelineSemester[],
): string | null {
  if (semesters && semesters.length > 0) {
    return semesters[0].term;
  }

  let earliestTermDate: Date | null = null;
  let earliestTermString: string | null = null;
  const activeStatuses = ['completed', 'inprogress', 'planned'];

  for (const info of Object.values(courseStatusMap)) {
    if (info.semester && activeStatuses.includes(info.status)) {
      try {
        const { start } = getTermRanges(info.semester);
        if (!earliestTermDate || start < earliestTermDate) {
          earliestTermDate = start;
          earliestTermString = info.semester;
        }
      } catch (e) {
        // Ignore invalid terms
      }
    }
  }
  return earliestTermString;
}

/**
 * Finds the latest active semester from the course status map.
 * Used as a reference point for calculating the expected graduation date.
 */
function getLatestActiveTermInfo(
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
): { termDate: Date | null; termString: string | null } {
  let latestTermDate: Date | null = null;
  let latestTermString: string | null = null;
  const activeStatuses = ['completed', 'inprogress', 'planned'];

  for (const info of Object.values(courseStatusMap)) {
    if (info.semester && activeStatuses.includes(info.status)) {
      try {
        const { end } = getTermRanges(info.semester);
        if (!latestTermDate || end > latestTermDate) {
          latestTermDate = end;
          latestTermString = info.semester;
        }
      } catch (e) {
        // Ignore invalid terms
      }
    }
  }

  return { termDate: latestTermDate, termString: latestTermString };
}

/**
 * Calculates the number of missing credits required to complete the degree,
 * based on the remaining required credits in all course pools.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function calculateMissingCredits(
  pools: CoursePoolData[],
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
): Promise<number> {
  const activeStatuses = ['completed', 'inprogress', 'planned'];
  const activeCourseRefs = Object.entries(courseStatusMap)
    .filter(([, info]) => activeStatuses.includes(info.status))
    .map(([id]) => id);

  const courseIdsToFetch = new Set<string>();
  for (const pool of pools) {
    if (pool.courses) {
      pool.courses.forEach((c) => courseIdsToFetch.add(c));
    }
  }
  activeCourseRefs.forEach((c) => courseIdsToFetch.add(c));

  let courseCreditsMap: Record<string, number> = {};
  if (courseIdsToFetch.size > 0) {
    const courses = await Course.find({
      _id: { $in: Array.from(courseIdsToFetch) },
    })
      .select('credits')
      .lean<{ _id: string; credits?: number }[]>()
      .exec();
    courseCreditsMap = Object.fromEntries(
      courses.map((c) => [c._id.toString(), c.credits!]),
    );
  }

  let missingCredits = 0;
  for (const pool of pools) {
    let activeCreditsInPool = 0;
    if (pool.courses) {
      for (const courseId of pool.courses) {
        const info = courseStatusMap[courseId];
        if (info && activeStatuses.includes(info.status)) {
          activeCreditsInPool += courseCreditsMap[courseId] || 3;
        }
      }
    }
    const poolRequired = pool.creditsRequired || 0;
    if (poolRequired > activeCreditsInPool) {
      missingCredits += poolRequired - activeCreditsInPool;
    }
  }

  return missingCredits;
}

/**
 * Determines the expected graduation term based on missing credits and
 * the latest enrolled term.
 */
function calculateExpectedGraduationTerm(
  missingCredits: number,
  latestTermDate: Date | null,
  latestTermString: string | null,
): string {
  let referenceDate = new Date();

  if (latestTermDate && latestTermString) {
    if (missingCredits <= 0) {
      return latestTermString;
    }
    if (latestTermDate > new Date()) {
      referenceDate = new Date(
        latestTermDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
    }
  }

  return estimateGraduation(missingCredits, referenceDate);
}

/**
 * Determines the curriculum academic year and expected graduation term
 * for a timeline based on its course status map.
 */
async function estimateTimelineGraduation(
  degreeId: string,
  courseStatusMap:
    | Record<string, { status: CourseStatus; semester: string | null }>
    | undefined
    | null,
  semesters?: TimelineSemester[],
): Promise<TimelineEstimation> {
  const map = courseStatusMap ?? {};

  // 1. Identify First Term to determine the Academic Year Context
  const firstTerm = getFirstActiveTerm(map, semesters);
  let academicYear: string | undefined;

  if (firstTerm) {
    const rawAcademicYear = graduationTermToAcademicYear(firstTerm);
    academicYear = normalizeAcademicYear(rawAcademicYear) as string;
  }

  // Normally from here we should apply transition measures up to
  // the latest active academic year to get the course pools, but since we dont support that yet
  // we will simply use the latest active academic year as the context for fetching the degree and course pool data,
  // which will be used to calculate missing credits and expected graduation term.

  const { termString } = getLatestActiveTermInfo(map);
  academicYear = normalizeAcademicYear(
    graduationTermToAcademicYear(termString!),
  );

  // 2. Fetch Course Pools
  const pools = await degreeController.getCoursePoolsForDegree(
    degreeId,
    academicYear,
  );

  // 3. Calculate Missing Credits
  const missingCredits = await calculateMissingCredits(pools, map);

  // 4. Identify Latest Enrolled Term
  const { termDate: latestTermDate, termString: latestTermString } =
    getLatestActiveTermInfo(map);

  // 5. Calculate expected graduation
  const expectedGraduation = calculateExpectedGraduationTerm(
    missingCredits,
    latestTermDate,
    latestTermString,
  );

  if (!academicYear) {
    const rawAcademicYear = graduationTermToAcademicYear(expectedGraduation);
    academicYear = normalizeAcademicYear(rawAcademicYear) as string;
  }

  return { academicYear, expectedGraduation };
}

/**
 * Extracts courseStatusMap from timeline, returning empty object if not present
 */
function buildCourseStatusMap(
  courses: Record<string, TimelineCourse>,
): Record<string, { status: CourseStatus; semester: string | null }> {
  return Object.fromEntries(
    Object.entries(courses || {})
      .filter(([, course]) => course.status.status !== 'incomplete')
      .map(([courseId, course]) => [
        courseId,
        {
          status: course.status.status,
          semester: course.status.semester,
        },
      ]),
  );
}

/**
 * Processes deficiencies into a requirement category
 */
function processDeficiencies(
  deficiencies: string[],
  allCourses: Record<string, CourseData>,
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
): RequirementCategory {
  let deficiencyCredits = 0;
  let deficiencyCompleted = 0;
  let deficiencyInProgress = 0;
  const deficiencyCourses: AuditCourse[] = [];

  for (const courseCode of deficiencies) {
    const courseData = allCourses[courseCode];
    const credits = courseData?.credits || 3;
    deficiencyCredits += credits;

    const statusInfo = courseStatusMap[courseCode];
    const status = statusInfo
      ? mapCourseStatus(statusInfo.status, statusInfo.semester)
      : 'Missing';

    if (status === 'Completed') {
      deficiencyCompleted += credits;
    } else if (status === 'In Progress') {
      deficiencyInProgress += credits;
    }

    deficiencyCourses.push({
      id: `course-def-${courseCode.replaceAll(/\s+/g, '-')}`,
      code: courseCode,
      title: courseData?.title || 'Deficiency Course',
      credits,
      status,
      term: statusInfo?.semester || undefined,
    });
  }

  // Use the same status determination logic as regular requirements
  const defStatus = determineRequirementStatus(
    deficiencyCompleted,
    deficiencyInProgress,
    deficiencyCredits,
  );

  return {
    id: 'deficiencies',
    title: 'Deficiency Courses',
    status: defStatus,
    creditsCompleted: deficiencyCompleted,
    creditsTotal: deficiencyCredits,
    courses: deficiencyCourses,
  };
}

/**
 * Processes exemptions into a requirement category
 */
function processExemptions(
  exemptions: string[],
  allCourses: Record<string, CourseData>,
): RequirementCategory {
  let exemptionCredits = 0;
  const exemptionCourses: AuditCourse[] = [];

  for (const courseCode of exemptions) {
    const courseData = allCourses[courseCode];
    const credits = courseData?.credits || 3;
    exemptionCredits += credits;

    exemptionCourses.push({
      id: `course-ex-${courseCode.replaceAll(/\s+/g, '-')}`,
      code: courseCode,
      title: courseData?.title || 'Exempted Course',
      credits,
      status: 'Completed',
      term: undefined,
    });
  }

  return {
    id: 'exemptions',
    title: 'Exempted Courses',
    status: 'Complete',
    creditsCompleted: exemptionCredits,
    creditsTotal: exemptionCredits,
    courses: exemptionCourses,
  };
}

/**
 * Calculates progress stats from requirements
 */
function calculateProgressStats(
  requirements: RequirementCategory[],
  totalCredits: number,
): ProgressStats {
  let completedCredits = 0;
  let inProgressCredits = 0;

  for (const req of requirements) {
    if (req.id !== 'exemptions') {
      completedCredits += req.creditsCompleted;
      const reqInProgress = req.courses
        .filter((c) => c.status === 'In Progress')
        .reduce((acc, c) => acc + c.credits, 0);
      inProgressCredits += reqInProgress;
    }
  }

  const remainingCredits = Math.max(
    0,
    totalCredits - completedCredits - inProgressCredits,
  );
  const percentage = Math.round((completedCredits / totalCredits) * 100);

  return {
    completed: completedCredits,
    inProgress: inProgressCredits,
    remaining: remainingCredits,
    total: totalCredits,
    percentage: Math.min(100, percentage),
  };
}

/**
 * Builds student info from user and degree data
 */
function buildStudentInfo(
  degreeData: { name: string },
  firstSemester: string | undefined,
  expectedGraduation: string,
  user?: { _id: string; fullname: string; email: string },
): StudentInfo {
  return {
    name: user?.fullname,
    program: degreeData.name,
    admissionTerm: firstSemester,
    expectedGraduation,
  };
}

/**
 * Sorts requirements by status (incomplete first)
 */
function sortRequirementsByStatus(
  requirements: RequirementCategory[],
): RequirementCategory[] {
  const order: Record<RequirementStatus, number> = {
    Missing: 0,
    'Not Started': 1,
    Incomplete: 2,
    'In Progress': 3,
    Complete: 4,
  };
  return requirements.sort((a, b) => order[a.status] - order[b.status]);
}

/**
 * Fetches and validates timeline data
 */
async function fetchAndValidateTimeline(
  timelineId: string,
  userId: string,
): Promise<TimelineWithUser> {
  const timeline = await Timeline.findById(timelineId)
    .lean<TimelineWithUser>()
    .exec();

  if (!timeline) {
    throw new Error('Timeline not found');
  }

  if (timeline.userId !== userId) {
    throw new Error('Unauthorized: Timeline does not belong to this user');
  }

  return timeline;
}

/**
 * Fetches and validates user data
 */
async function fetchAndValidateUser(
  userId: string,
): Promise<{ _id: string; fullname: string; email: string }> {
  const user = await User.findById(userId)
    .lean<{ _id: string; fullname: string; email: string }>()
    .exec();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Builds a courses dictionary from an array
 */
function buildCoursesDictionary(
  courseArr: CourseData[],
): Record<string, CourseData> {
  const allCourses: Record<string, CourseData> = {};
  for (const c of courseArr) {
    allCourses[c._id] = c;
  }
  return allCourses;
}

/**
 * Processes course pools into requirement categories
 */
function processCoursePools(
  coursePools: CoursePoolData[],
  allCourses: Record<string, CourseData>,
  courseStatusMap: Record<
    string,
    { status: CourseStatus; semester: string | null }
  >,
): RequirementCategory[] {
  return coursePools.map((pool) =>
    processPoolToRequirement(pool, allCourses, courseStatusMap),
  );
}

/**
 * Main function to generate a degree audit from timeline data
 */
export async function generateDegreeAudit(
  params: GenerateAuditParams,
): Promise<DegreeAuditData> {
  const { timelineId, userId } = params;

  const timeline = await fetchAndValidateTimeline(timelineId, userId);
  const user = await fetchAndValidateUser(userId);

  const { academicYear, expectedGraduation } = await estimateTimelineGraduation(
    timeline.degreeId,
    timeline.courseStatusMap,
    timeline.semesters,
  );

  const [degreeData, coursePools, courseArr] = await Promise.all([
    degreeController.readDegree(timeline.degreeId, academicYear),
    degreeController.getCoursePoolsForDegree(timeline.degreeId, academicYear),
    degreeController.getCoursesForDegree(timeline.degreeId, academicYear),
  ]);

  const allCourses = buildCoursesDictionary(courseArr);
  const courseStatusMap = timeline.courseStatusMap ?? {};

  return buildDegreeAudit({
    degreeData,
    coursePools,
    allCourses,
    courseStatusMap,
    deficiencies: timeline.deficiencies,
    exemptions: timeline.exemptions,
    semesters: timeline.semesters,
    user,
    expectedGraduation,
  });
}

interface BuildAuditOptions {
    degreeData: DegreeData;
    coursePools: CoursePoolData[];
    allCourses: Record<string, CourseData>;
    courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>;
    deficiencies: string[];
    exemptions: string[];
    semesters: TimelineSemester[];
    user?: { _id: string; fullname: string; email: string };
    expectedGraduation?: string;
}

function buildDegreeAudit({
  degreeData,
  coursePools,
  allCourses,
  courseStatusMap,
  deficiencies,
  exemptions,
  semesters,
  user,
  expectedGraduation,
}: BuildAuditOptions) {
  const requirements = processCoursePools(
    coursePools,
    allCourses,
    courseStatusMap,
  );

  if (deficiencies && deficiencies.length > 0) {
    requirements.push(
      processDeficiencies(deficiencies, allCourses, courseStatusMap),
    );
  }

  if (exemptions && exemptions.length > 0) {
    requirements.push(processExemptions(exemptions, allCourses));
  }

  const totalCredits = degreeData.totalCredits || 120;
  const progress = calculateProgressStats(requirements, totalCredits);

  const firstSemester = semesters?.[0]?.term;
  const student = buildStudentInfo(
    degreeData,
    firstSemester,
    expectedGraduation || '',
    user,
  );

  const notices = generateNotices(requirements, progress);
  sortRequirementsByStatus(requirements);

  return {
    student,
    progress,
    notices,
    requirements,
  };
}

export async function generateDegreeAuditForUser(
  userId: string,
): Promise<DegreeAuditData> {
  // Find the most recently updated timeline for this user
  const timeline = await Timeline.findOne({ userId })
    .sort({ updatedAt: -1 })
    .lean<TimelineWithUser>()
    .exec();

  if (!timeline?._id) {
    throw new Error('No timeline found for this user');
  }

  return generateDegreeAudit({
    timelineId: timeline._id.toString(),
    userId,
  });
}

export async function generateDegreeAuditFromTimeline(timeline:TimelineResult){
  if (!timeline.degree || !timeline.pools || !timeline.semesters)
    throw new Error('degree, coursePools and semesters are required to generate the degree audit');

  const courseStatusMap = buildCourseStatusMap(timeline.courses)
  const { academicYear, expectedGraduation } = await estimateTimelineGraduation(
    timeline.degree._id,
    courseStatusMap,
    timeline.semesters,
  );

  const [degreeData, coursePools, courseArr] = await Promise.all([
    degreeController.readDegree(timeline.degree._id, academicYear),
    degreeController.getCoursePoolsForDegree(timeline.degree._id, academicYear),
    degreeController.getCoursesForDegree(timeline.degree._id, academicYear),
  ]);

  const allCourses = buildCoursesDictionary(courseArr);


  const exemptionPool = coursePools.find(p => p._id === 'exemptions');
  const deficiencyPool = coursePools.find(p => p._id === 'deficiencies');
  const exemptions = exemptionPool?.courses ?? [];
  const deficiencies = deficiencyPool?.courses ?? [];


  return buildDegreeAudit({
    degreeData,
    coursePools,
    allCourses,
    courseStatusMap,
    deficiencies,
    exemptions,
    semesters: timeline.semesters,
    expectedGraduation,
  });
}
