import { CourseData } from '@shared/degree';
import { normalizeCourseCode } from './courseHelper';
import { TimelineCourse } from '@shared/timeline';
import { CourseStatus } from '@shared/timeline';

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
