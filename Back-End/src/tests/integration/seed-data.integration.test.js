const {
  getScraperData,
  cleanupScraperFiles,
} = require('./utils/data/scraperData');
const ApiClient = require('./utils/api/apiClient');
const { getTestApp } = require('./utils/app/testApp');
const {
  getValidationFiles,
  processDegreeFile,
  logValidationSummary,
} = require('./utils/data/seedTestHelpers');

describe('Seed ALL via /api/admin/seed-data endpoint', () => {
  let apiClient;
  let app;

  beforeAll(async () => {
    console.log('Starting test setup...');
    // Initialize app and API client
    app = await getTestApp();
    apiClient = new ApiClient(app);
    // Login as admin
    await apiClient.login({
      email: 'admin@test.com',
      password: 'testpassword',
    });
    // Get and save scraper data in temp files
    await getScraperData();
    console.log('Setup complete...');
  });

  afterAll(async () => {
    // Cleanup scraper temp files
    await cleanupScraperFiles();
  });

  test('seeds all degrees and validates integrity', async () => {
    // Seed all data and expect 200 response
    console.log('Starting seed operation...');
    const seedRes = await apiClient.seedDegreeData();
    expect(seedRes.status).toBe(200);

    // Get and process validation files
    const degreeFiles = getValidationFiles();
    let successCount = 0;
    let totalCourses = 0;
    let totalPools = 0;
    const validationErrors = [];

    for (const [index, file] of degreeFiles.entries()) {
      try {
        // Process each degree file
        const result = await processDegreeFile(file, index, degreeFiles.length);

        if (result.hasErrors) {
          validationErrors.push({
            degreeId: result.degreeId,
            errorReporter: result.errorReporter,
          });
        } else {
          successCount++;
        }

        totalCourses += result.coursesCount;
        totalPools += result.poolsCount;
      } catch (error) {
        console.error(`Failed to process file ${file}:`, error.message);
        throw error;
      }
    }

    // Final validation check
    if (validationErrors.length > 0) {
      const totalErrors = validationErrors.reduce(
        (sum, { errorReporter }) => sum + errorReporter.errors.length,
        0,
      );
      throw new Error(
        `${totalErrors} total validation errors found across ${validationErrors.length} degrees`,
      );
    }

    logValidationSummary(
      successCount,
      degreeFiles.length,
      totalCourses,
      totalPools,
    );
  });
});