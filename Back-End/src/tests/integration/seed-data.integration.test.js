const {
  getAllDegreeNames,
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

describe('Seed via /api/admin/seed-data endpoint', () => {
  let apiClient;
  let app;
  let degreeNames;
  // Promise to signal when setup is complete - avoids concurrent tests to start before scraper data is ready
  let setupReadyResolve;
  const setupReadyPromise = new Promise((resolve) => {
    setupReadyResolve = resolve;
  });

  beforeAll(async () => {
    console.log('Starting test setup...');
    // Get degree names for test discovery
    degreeNames = await getAllDegreeNames();
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

  test('seeds and validates all degrees', async () => {
    // Wait for setup to complete
    await setupReadyPromise;
    
    console.log(`Starting seed operations for ${degreeNames.length} degrees...`);
    
    // Process all degrees concurrently
    const degreePromises = degreeNames.map(async (degreeName) => {
      console.log(`Starting seed operation for ${degreeName}...`);
      
      try {
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

        console.log(`${degreeName}: ${result.poolsCount} pools validated successfully`);
        
        expect(result.hasErrors).toBe(false);
        expect(result.poolsCount).toBeGreaterThan(0);
        
        return { degreeName, success: true, poolsCount: result.poolsCount };
      } catch (error) {
        console.error(`Failed to process ${degreeName}:`, error.message);
        return { degreeName, success: false, error: error.message };
      }
    });

    // Wait for all degrees to complete
    const results = await Promise.all(degreePromises);
    
    // Check results and report any failures
    const failures = results.filter(result => !result.success);
    const successes = results.filter(result => result.success);
    
    console.log(`Completed processing ${results.length} degrees: ${successes.length} successful, ${failures.length} failed`);
    
    if (failures.length > 0) {
      const failureReport = failures.map(failure => `${failure.degreeName}: ${failure.error}`).join('\n');
      throw new Error(`${failures.length} degrees failed validation:\n${failureReport}`);
    }
    
    // All degrees should have succeeded
    expect(failures.length).toBe(0);
    expect(successes.length).toBe(degreeNames.length);
  });
});