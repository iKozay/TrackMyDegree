import { TimelineCourse, CourseStatus, CourseData } from '@trackmydegree/shared';

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
    offeredIn: course.offeredIn,
    rules: course.rules,
    status: {
      status: override?.status ?? 'incomplete',
      semester: override?.semester ?? null,
    },
  };
}
