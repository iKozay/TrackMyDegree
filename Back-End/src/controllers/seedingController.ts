import { DegreeController } from './degreeController';
import { CoursePoolController } from './coursepoolController';
import { CourseController } from './courseController';
import { parseDegree, ParseDegreeResponse } from '@utils/pythonUtilsApi';
import { DEGREES_URL } from '@utils/constants';

/* Seed degree data in the database */
export async function seedDegreeData(degreeName: string): Promise<void> {
  // Validate degree name
  if (!DEGREES_URL[degreeName]) {
    console.error(
      'Degree name "' + degreeName + '" not found in degreesURL map.',
    );
    return;
  }

  console.log('Seeding data for degree: ' + degreeName);
  let data: ParseDegreeResponse = await parseDegree(DEGREES_URL[degreeName]);
  console.log('Scraped data for degree: ' + degreeName);

  await saveToMongoDB(degreeName, data);

  console.log('Seeding completed for degree: ' + degreeName);
}

export async function seedAllDegreeData(): Promise<void> {
  const degreeNames = Object.keys(DEGREES_URL);
  for (const degreeName of degreeNames) {
    try {
      await seedDegreeData(degreeName);
    } catch (err) {
      console.error(`Seeding failed for degree ${degreeName}:`, err);
    }
  }
  console.log('Seeding completed for all degrees.');
}

async function saveToMongoDB(
  degreeName: string,
  data: ParseDegreeResponse,
): Promise<void> {
  const degreeController = new DegreeController();
  const coursepoolController = new CoursePoolController();
  const courseController = new CourseController();

  try {
    const degreeCreated = await degreeController.createDegree(data['degree']);
    if (degreeCreated) {
      console.log(`Degree ${data['degree']._id} created successfully.`);
    } else {
      await degreeController.updateDegree(data['degree']._id, data['degree']);
      console.log(
        `Degree ${data['degree']._id} already exists. Updated existing degree.`,
      );
    }
  } catch (err) {
    console.error(`Error creating/updating degree: ${data['degree']._id}`, err);
  }

  // Run course pool and course creation in parallel
  try {
      await coursepoolController.bulkCreateCoursePools(data['course_pool']);
      await courseController.bulkCreateCourses(data['courses']);
  } catch (err) {
    console.error(
      `Error creating course pools or courses for degree: ${degreeName}`,
      err,
    );
  }
}
