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
const { DEGREES_URL } = require('../../utils/constants');

describe('Seed via /api/admin/seed-data endpoint', () => {
  let apiClient;
  let app;
  // Promise to signal when setup is complete - avoids concurrent tests to start before scraper data is ready
  let setupReadyResolve;
  const setupReadyPromise = new Promise((resolve) => {
    setupReadyResolve = resolve;
  });

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
    // signal that setup is ready
    setupReadyResolve();
    console.log('Setup ready. Running concurrent degree set and validation tests...')
  });

  afterAll(async () => {
    // Cleanup scraper temp files
    await cleanupScraperFiles();
  });

  // Create individual test for each degree
  const degreeNames = Object.keys(DEGREES_URL);
    // concurrently test each degree to speed up the test process
    test.concurrent.each(degreeNames)('seeds and validates %s degree', async (degreeName) => {
      // Wait for setup to complete
      await setupReadyPromise;
      console.log(`Starting seed operation for ${degreeName}...`);
      
      // Seed specific degree
      const seedRes = await apiClient.seedDegreeData(degreeName);
      expect(seedRes.status).toBe(200);

      // Get validation files and find the one for this degree
      const degreeFiles = getValidationFiles();
      const safeName = degreeName.replaceAll(' ', '_');
      const expectedFileName = `temp_scraper_output_${safeName}.json`;
      const degreeFile = degreeFiles.find(file => file === expectedFileName);

      if (!degreeFile) {
        console.log('Available files:', degreeFiles);
        console.log('Looking for:', expectedFileName);
        throw new Error(`Validation file not found for degree: ${degreeName}`);
      }

      try {
        // Process this specific degree file
        const result = await processDegreeFile(degreeFile, 0, 1);

        if (result.hasErrors) {
          const totalErrors = result.errorReporter.errors.length;
          console.error(`Validation errors for ${degreeName}:`, result.errorReporter.errors);
          
          const errorMessages = result.errorReporter.errors.map(error => {
            if (typeof error === 'string') return error;
            if (error.message) return error.message;
            if (error.error) return error.error;
            return JSON.stringify(error);
          }).filter(Boolean);
          
          const limitedErrors = errorMessages.slice(0, 20);
          const remainingCount = errorMessages.length - 20;
          
          if (remainingCount > 0) {
            limitedErrors.push(`+ ${remainingCount} more errors`);
          }
          
          throw new Error(
            `${totalErrors} validation errors found for ${degreeName}:\n${limitedErrors.join('\n')}`
          );
        }

        console.log(`${degreeName}: ${result.coursesCount} courses, ${result.poolsCount} pools validated successfully`);
        
        expect(result.hasErrors).toBe(false);
        expect(result.coursesCount).toBeGreaterThan(0);
        expect(result.poolsCount).toBeGreaterThan(0);
      } catch (error) {
        console.error(`Failed to process ${degreeName}:`, error.message);
        throw error;
      }
    });
  });