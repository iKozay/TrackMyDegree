const { mkdir, writeFile, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { getDegreeNames, parseDegree, getAllCourses } = require('../../../../utils/pythonUtilsApi');
/*
 * Utility to scrape degree data and write to temp json files for integration tests to use.
 * Also provides cleanup function to remove temp files after tests complete.
 */

// Default to system temp directory for cross-platform compatibility
const DEFAULT_TEMP_DIR = path.join(os.tmpdir(), 'scraper-test-data');

async function getAllDegreeNames() {
  try {
    const degreeNames = await getDegreeNames();
    return degreeNames;
  } catch (e) {
    console.error(`Error fetching degree names: ${e.message}`);
    throw e;
  }
}

// scrape all degrees and write each JSON to a temp file
async function getScraperData() {
  console.log('Getting scraper data...');
  const degreeNames = await getAllDegreeNames();
  const written = [];

  try {
    await mkdir(DEFAULT_TEMP_DIR, { recursive: true });
  } catch (e) {
    console.error(
      `Failed to create temp dir ${DEFAULT_TEMP_DIR}: ${e.message}`,
    );
    throw e;
  }

  // Process each degree and write to a separate file
  await Promise.all(
    // save each degree's scraped data to a separate file
    degreeNames.map(async (degreeName) => {
      try {
        const data = await parseDegree(degreeName);
        const safeName = degreeName.replaceAll(/\s+/g, '_');
        const file = path.join(
          DEFAULT_TEMP_DIR,
          `temp_scraper_output_${safeName}.json`,
        );
        await writeFile(file, JSON.stringify(data, null, 2));
        written.push(file);
      } catch (e) {
        console.error(
          `Error getting scrapper data for "${degreeName}": ${e.message}`,
        );
      }
    }),
  );

  // Save all courses data to a separate file for course-related tests
  try {
    const allCoursesData = await getAllCourses();
    const coursesFile = path.join(
      DEFAULT_TEMP_DIR,
      `temp_scraper_output_all_courses.json`,
    );
    await writeFile(coursesFile, JSON.stringify(allCoursesData, null, 2));
    written.push(coursesFile);
  } catch (e) {
    console.error(`Error getting all courses data: ${e.message}`);
  }

  if (written.length > 0) {
    console.log(`Written ${written.length}/${degreeNames.length} files`);
  }

  return written;
}

// remove generated temp directory
async function cleanupScraperFiles() {
  try {
    await rm(DEFAULT_TEMP_DIR, { recursive: true, force: true });
  } catch (e) {
    console.error(
      `Unexpected removal error for ${DEFAULT_TEMP_DIR}: ${e.message}`,
    );
  }
}

module.exports = { getAllDegreeNames, getScraperData, cleanupScraperFiles, DEFAULT_TEMP_DIR };
