import { normalizeCourseCode } from './courseHelper';
import { TimelineCourse, CourseStatus, CourseData, Rule, RuleType } from '@shared';

export function mapCoursesToTimelineFormat(
  courses: Record<string, CourseData>,
  courseStatusMap: Record<string, { status: CourseStatus; semester: string | null }>
): Record<string, TimelineCourse> {
  return Object.fromEntries(
    Object.entries(courses).map(([code, course]) => {
      return [code, toTimelineCourse(course, courseStatusMap[code])];
    }),
  );
}

function toTimelineCourse(
  course: CourseData,
  override?: { status: CourseStatus; semester: string | null },
): TimelineCourse {
  return {
    id: course._id,
    title: course.title,
    credits: course.credits,
    description: course.description,
    offeredIn: course.offeredIn ?? [],
    prerequisites: mapRequisites(RuleType.Prerequisite, course.rules),
    corequisites: mapRequisites(RuleType.Corequisite, course.rules),
    status: {
      status: override?.status ?? 'incomplete',
      semester: override?.semester ?? null,
    },
  };
}

// Converts prerequisite/corequisite rules from the DB format
// (string[][] where each inner array represents an OR group)
// into the timeline format: [{ anyOf: string[] }]
function mapRequisites(type: RuleType, rules: Rule[]): { anyOf: string[] }[] {
  const reqRules = rules.filter((r) => r.type === type);
  return reqRules.map((r) => ({
    anyOf: r.params.courseList.map(normalizeCourseCode),
  }));
}
