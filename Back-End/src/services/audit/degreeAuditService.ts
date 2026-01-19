import { Timeline, User } from '@models';
import {
  degreeController,
  CoursePoolInfo,
} from '@controllers/degreeController';
import { CourseData } from '@controllers/courseController';
import { CourseStatus } from '../../types/transcript';
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
} from '@shared/audit';
import { TimelineDocument } from '@services/timeline/timelineService';

interface TimelineWithUser extends TimelineDocument {
  userId: string;
}

/**
 * Maps internal course status to audit display status
 */
function mapCourseStatus(status: CourseStatus): CourseAuditStatus {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'inprogress':
      // eslint-disable-next-line sonarjs/no-duplicate-string
      return 'In Progress';
    case 'planned':
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
  pool: CoursePoolInfo,
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
    const status = statusInfo ? mapCourseStatus(statusInfo.status) : 'Missing';
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

/**
 * Estimates expected graduation based on remaining credits
 */
function estimateGraduation(remainingCredits: number): string {
  const creditsPerSemester = 15; // Average credits per semester
  const semestersRemaining = Math.ceil(remainingCredits / creditsPerSemester);

  const today = new Date();
  const currentMonth = today.getMonth();
  let currentYear = today.getFullYear();

  // Determine current term
  const termIndex = getTermIndex(currentMonth);
  const { term, year } = calculateFutureGraduation(
    termIndex,
    currentYear,
    semestersRemaining,
  );

  return `${term} ${year}`;
}

/**
 * Gets the term index based on month
 */
function getTermIndex(month: number): number {
  if (month >= 0 && month <= 3) return 0; // Winter
  if (month >= 4 && month <= 7) return 1; // Summer
  return 2; // Fall
}

/**
 * Calculates the future graduation term and year
 */
function calculateFutureGraduation(
  startTermIndex: number,
  startYear: number,
  semestersRemaining: number,
): { term: string; year: number } {
  const terms = ['Winter', 'Summer', 'Fall'];
  let termIndex = startTermIndex;
  let year = startYear;

  for (let i = 0; i < semestersRemaining; i++) {
    termIndex++;
    if (termIndex >= 3) {
      termIndex = 0;
      year++;
    }
  }

  return { term: terms[termIndex], year };
}

/**
 * Extracts courseStatusMap from timeline, returning empty object if not present
 */
function buildCourseStatusMap(
  timeline: TimelineWithUser,
): Record<string, { status: CourseStatus; semester: string | null }> {
  if (!timeline.courseStatusMap) {
    return {};
  }
  return { ...timeline.courseStatusMap };
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
  const deficiencyCourses: AuditCourse[] = [];

  for (const courseCode of deficiencies) {
    const courseData = allCourses[courseCode];
    const credits = courseData?.credits || 3;
    deficiencyCredits += credits;

    const statusInfo = courseStatusMap[courseCode];
    const status = statusInfo ? mapCourseStatus(statusInfo.status) : 'Missing';

    if (status === 'Completed') {
      deficiencyCompleted += credits;
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

  return {
    id: 'deficiencies',
    title: 'Deficiency Courses',
    status:
      deficiencyCompleted >= deficiencyCredits ? 'Complete' : 'Incomplete',
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
  user: { _id: string; fullname: string; email: string },
  degreeData: { name: string },
  firstSemester: string | undefined,
  remainingCredits: number,
): StudentInfo {
  return {
    name: user.fullname,
    program: degreeData.name,
    admissionTerm: firstSemester,
    expectedGraduation: estimateGraduation(remainingCredits),
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
  coursePools: CoursePoolInfo[],
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

  const [degreeData, coursePools, courseArr] = await Promise.all([
    degreeController.readDegree(timeline.degreeId),
    degreeController.getCoursePoolsForDegree(timeline.degreeId),
    degreeController.getCoursesForDegree(timeline.degreeId),
  ]);

  const allCourses = buildCoursesDictionary(courseArr);
  const courseStatusMap = buildCourseStatusMap(timeline);

  const requirements = processCoursePools(
    coursePools,
    allCourses,
    courseStatusMap,
  );

  if (timeline.deficiencies && timeline.deficiencies.length > 0) {
    requirements.push(
      processDeficiencies(timeline.deficiencies, allCourses, courseStatusMap),
    );
  }

  if (timeline.exemptions && timeline.exemptions.length > 0) {
    requirements.push(processExemptions(timeline.exemptions, allCourses));
  }

  const totalCredits = degreeData.totalCredits || 120;
  const progress = calculateProgressStats(requirements, totalCredits);

  const firstSemester = timeline.semesters?.[0]?.term;
  const student = buildStudentInfo(
    user,
    degreeData,
    firstSemester,
    progress.remaining,
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
