const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_TEMP_DIR } = require('./scraperData');
const { validateDegreeIntegrity } = require('../validation/degreeValidator');
/*
 * Helpers for integration tests to process and validate scraped degree data files.
 */

// Utility functions for processing and validating scraped degree data files
function getValidationFiles() {
  console.log(`Checking temp directory: ${DEFAULT_TEMP_DIR}`);
  if (!fs.existsSync(DEFAULT_TEMP_DIR)) {
    throw new Error(`Scraped data directory not found: ${DEFAULT_TEMP_DIR}`);
  }

  const degreeFiles = fs
    .readdirSync(DEFAULT_TEMP_DIR)
    .filter(
      (file) =>
        file.startsWith('temp_scraper_output_') && file.endsWith('.json'),
    );

  console.log(`Found ${degreeFiles.length} degree files to validate:`);

  for (const [index, file] of degreeFiles.entries()) {
    console.log(`  ${index + 1}. ${file}`);
  }

  return degreeFiles;
}

// Parse and validate the structure of a degree JSON file
function parseAndValidateDegreeFile(filePath, fileName) {
  const degreeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  validateFileStructure(degreeData, fileName);
  return degreeData;
}

// Validate the expected structure of the degree data from JSON file
function validateFileStructure(degreeData, fileName) {
  if (!degreeData || typeof degreeData !== 'object') {
    throw new Error(`Invalid file structure in ${fileName}: not an object`);
  }

  if (!degreeData.degree) {
    throw new Error(
      `Invalid file structure in ${fileName}: missing 'degree' property`,
    );
  }

  if (!degreeData.degree._id) {
    throw new Error(
      `Invalid file structure in ${fileName}: degree missing '_id'`,
    );
  }
}

// Extract key metrics from degree data for logging
function extractDegreeMetrics(degreeData) {
  const degreeId = degreeData.degree._id;
  const coursesCount = degreeData.courses?.length || 0;
  const poolsCount = degreeData.course_pool?.length || 0;
  return { degreeId, coursesCount, poolsCount };
}

// Log progress for each processed file
function logFileProgress(
  index,
  totalFiles,
  file,
  degreeId,
  coursesCount,
  poolsCount,
) {
  console.log(
    `[${index + 1}/${totalFiles}] Processing file: ${file}`,
  );
}

// Process a single degree file: parse, validate structure, validate integrity
async function processDegreeFile(file, index, totalFiles) {
  const filePath = path.join(DEFAULT_TEMP_DIR, file);

  // Parse and validate file structure
  const degreeData = parseAndValidateDegreeFile(filePath, file);
  const { degreeId, coursesCount, poolsCount } =
    extractDegreeMetrics(degreeData);

  // Log progress
  logFileProgress(index, totalFiles, file, degreeId, coursesCount, poolsCount);

  // Validate degree integrity
  const errorReporter = await validateDegreeIntegrity(degreeData);

  if (errorReporter.hasErrors()) {
    errorReporter.logErrors(degreeId);
    return {
      degreeId,
      errorReporter,
      coursesCount,
      poolsCount,
      hasErrors: true,
    };
  } else {
    console.log(`Successfully validated: ${degreeId}`);
    return { degreeId, coursesCount, poolsCount, hasErrors: false };
  }
}

function logValidationSummary(
  successCount,
  totalFiles,
  totalCourses,
  totalPools,
) {
  console.log(`   ======VALIDATION SUMMARY======\n
                  Successfully validated: ${successCount}/${totalFiles} degrees\n
                  Total course pools validated: ${totalPools}\n
                  Total courses validated: ${totalCourses}\n
  `);
}

module.exports = {
  getValidationFiles,
  processDegreeFile,
  parseAndValidateDegreeFile,
  extractDegreeMetrics,
  logValidationSummary,
};
