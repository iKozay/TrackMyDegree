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
  
  console.log(`Starting parallel scraping for ${degreeNames.length} degrees...`);
  
  // Start all parsing operations in parallel
  const parsingPromises = degreeNames.map(async (degreeName) => {
    try {
      console.log(`Starting to scrape data for degree: ${degreeName}`);
      const data: ParseDegreeResponse = await parseDegree(DEGREES_URL[degreeName]);
      console.log(`Scraped data for degree: ${degreeName}`);
      return { degreeName, data, success: true };
    } catch (err) {
      console.error(`Scraping failed for degree ${degreeName}:`, err);
      return { degreeName, data: null, success: false, error: err };
    }
  });
  
  // Wait for all parsing to complete
  const results = await Promise.all(parsingPromises);
  console.log('All scraping operations completed. Processing results...');
  
  // Process successful results sequentially to avoid overwhelming the database
  let successCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    if (result.success && result.data) {
      try {
        console.log(`Seeding database for degree: ${result.degreeName}`);
        await saveToMongoDB(result.degreeName, result.data);
        console.log(`Seeding completed for degree: ${result.degreeName}`);
        successCount++;
      } catch (err) {
        console.error(`Database seeding failed for degree ${result.degreeName}:`, err);
        failCount++;
      }
    } else {
      failCount++;
    }
  }
  
  console.log(`Seeding completed for all degrees. Success: ${successCount}, Failed: ${failCount}`);
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
