import { CourseData } from "@shared/degree";
import { normalizeCourseCode } from './courseHelper';
import { degreeController } from '@controllers/degreeController';
import { courseController } from "@controllers/courseController";
import { Course } from '@models';

export async function getDegreeData(degreeId: string) {
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





export async function loadMissingCourses(
  coursesToAdd: string[],
  degreeCourses: Record<string, CourseData>,
) {
  for (const courseCode of coursesToAdd) {
    const normalizedCode = normalizeCourseCode(courseCode);
    if (!degreeCourses[normalizedCode]) {
      const courseData = await getCourseData(normalizedCode);
      if (!courseData) continue;
      degreeCourses[courseData._id] = courseData;
    }
  }
}

export async function getCourseData(courseCode: string) {
  try {

   const course = await Course.findById(courseCode)
      .select('-description -notes') // exclude these fields
      .lean<CourseData>()
      .exec();
    return course;
  } catch {
    // Courses not in the database are handled gracefully by callers,
    // which skip adding them to the degree course list.
    console.warn(`Course not found in database: ${courseCode}`);
    return null;
  }
}


export async function getDegreeId(degreeName: string) {
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