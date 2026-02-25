import { DegreeController } from './degreeController';
import { CoursePoolController } from './coursepoolController';
import { CourseController, CourseData } from './courseController';
import { getDegreeNames, parseDegree, parseAllDegrees, getAllCourses, ParseDegreeResponse } from '@utils/pythonUtilsApi';

/* Seed degree data (without courses) in the database */
export async function seedDegreeData(degreeName: string): Promise<string> {
  // Validate degree name
  const allDegreeNames = await getDegreeNames();
  if (!allDegreeNames.includes(degreeName)) {
    return `Degree name "${degreeName}" is not valid. Please choose from: ${allDegreeNames.join(', ')}`;
  }

  let degreeRequirements: ParseDegreeResponse = await parseDegree(degreeName);
  try {
    await saveDegreeRequirementsToDB(degreeRequirements);
    console.log('Seeding completed for degree: ' + degreeRequirements.degree.name);
    return `Seeding completed for degree: ${degreeRequirements.degree.name}`;
  } catch (err) {
    console.error(`Failed to seed degree data for degree: ${degreeRequirements.degree.name}`, err);
    return `Failed to seed degree data for degree: ${degreeRequirements.degree.name}. Error: ${err}`;
  }
}

export async function seedAllDegreeData(): Promise<string> {
  
  console.log('Starting seeding process for all degrees...');
  const allDegreeRequirements: ParseDegreeResponse[] = await parseAllDegrees();
  const allCourses: CourseData[] = await getAllCourses();
  
  let successCount = 0;
  let failCount = 0;

  for (const degreeData of allDegreeRequirements) {
    const degreeName = degreeData.degree._id;
    console.log(`Processing degree: ${degreeName}`);
    
    try {
      await saveDegreeRequirementsToDB(degreeData);
      successCount++;
      console.log(`Successfully seeded data for degree: ${degreeName}`);
    } catch (err) {
      failCount++;
      console.error(`Failed to seed data for degree: ${degreeName}`, err);
    }
  }

  let coursesSeeded = true;
  try {
    await saveCoursesToDB(allCourses);
    console.log('Successfully seeded all courses.');
  } catch (err: any) {
    coursesSeeded = false;
    console.error('Failed to seed courses', err);
  }

  return `Seeding completed for all degrees. Success: ${successCount}, Failed: ${failCount}.` + (coursesSeeded ? ' All courses seeded successfully.' : ' Failed to seed courses.');
}

async function saveDegreeRequirementsToDB(
  data: ParseDegreeResponse,
): Promise<void> {
  const degreeController = new DegreeController();
  const coursepoolController = new CoursePoolController();

  const degreeCreated = await degreeController.createDegree(data.degree);
  if (degreeCreated) {
    console.log(`Degree ${data.degree._id} created successfully.`);
  } else {
    await degreeController.updateDegree(data.degree._id, data.degree);
    console.log(`Degree ${data.degree._id} already exists. Updated existing degree.`);
  }

  await coursepoolController.bulkCreateCoursePools(data.coursePools);
  console.log(`Course pools for degree ${data.degree.name} created/updated successfully.`);
}

async function saveCoursesToDB(courses: CourseData[]): Promise<void> {
  const courseController = new CourseController();
  await courseController.bulkCreateCourses(courses);
  console.log(`Courses created/updated successfully.`);
}
