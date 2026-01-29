const { Degree } = require('@models/degree');
const { CoursePool } = require('@models/coursepool');
const { Course } = require('@models/course');
const {
  validateFields,
  validateArrayFields,
  validateReference,
  compareArraysOfArrays,
  compareSimpleArrays
} = require('./validationHelpers');
const { ValidationErrorReporter } = require('./errorReporter');
const {
  findExpectedCourseData,
} = require('../data/courseDataHelper');
/*
 * Helper functions to validate degree integrity against the database
 * Ensures that all referenced course pools and courses exist
 * and that all fields match between the scraped data and the database records
 * Uses batch queries and lookup maps for efficiency
 */

// Main function to validate degree integrity takes degree data from the scraper
async function validateDegreeIntegrity(degreeData) {
  const { degree, course_pool } = degreeData;
  const errorReporter = new ValidationErrorReporter();

  // Batch collect all IDs first
  const poolIds = course_pool?.map((pool) => pool._id) || [];
  const allCourseIds = course_pool?.flatMap((pool) => pool.courses || []) || [];

  // Single batch queries, parallel execution. Reduces number of DB calls for faster test execution time.
  const [dbDegree, dbPools, dbCourses] = await Promise.all([
    Degree.findById(degree._id),
    CoursePool.find({ _id: { $in: poolIds } }),
    Course.find({ _id: { $in: allCourseIds } }),
  ]);

  // Create lookup sets and maps - for faster validation and reduction of nested queries
  const courseSet = new Set(dbCourses.map((c) => c._id.toString())); // set of existing course IDs
  const poolMap = new Map(dbPools.map((p) => [p._id.toString(), p])); // key-value map of course pool ID to course pool document

  // Validate degree
  if (!dbDegree) {
    errorReporter.addMissingEntity('Degree', degree._id);
    return errorReporter;
  }

  try {
    // Validate degree fields
    validateFields(degree, dbDegree, {
      name: 'name',
      totalCredits: 'totalCredits',
    });
  } catch (error) {
    errorReporter.addValidationFailure(
      'degree_fields',
      'matching fields',
      error.message,
      { degreeId: degree._id },
    );
  }

  // Validate course pools
  validateCoursePoolIntegrity(course_pool, {
    poolMap,
    courseSet,
    dbDegree,
    errorReporter,
    degreeId: degree._id,
  });

  // Validate courses prerequisites and corequisites
  validateCoursePrereqCoreqIntegrity(dbCourses, { degreeId: degree._id, errorReporter });
  
  return errorReporter;
}

// validate fields of a single course pool
function validateCoursePoolFields(scraperPool, dbPool, errorReporter) {
  try {
    // Validate pool fields
    validateFields(scraperPool, dbPool, {
      name: 'name',
      creditsRequired: 'creditsRequired',
    });
    // Validate course array
    validateArrayFields(scraperPool, dbPool, { courses: 'courses' });
  } catch (error) {
    errorReporter.addValidationFailure(
      'pool_fields',
      'matching fields',
      error.message,
      { poolId: scraperPool._id, dbPoolId: dbPool._id },
    );
  }
}
// validate integrity of course pools within a degree using pre-fetched data from batch queries
function validateCoursePoolIntegrity(
  course_pool,
  { poolMap, courseSet, dbDegree, errorReporter, degreeId },
) {
  // Validate course pools existence
  if (!course_pool || !Array.isArray(course_pool)) return;
  // Iterate through each course pool in the degree data
  for (const scraperPool of course_pool) {
    // Get pool ID string from scraper data
    const scraperPoolId = scraperPool._id.toString();
        // look up corresponding DB pool
      const dbPool = poolMap.get(scraperPoolId);

      if (!dbPool) {
          errorReporter.addMissingEntity('CoursePool', scraperPool._id, {
              degreeId,
              poolName: scraperPool.name,
              parentType: 'Degree',
              parentId: degreeId
          });
          continue;
      }
    console.log('Validating Scraper CoursePool:', scraperPoolId, 'against DB pool:', dbPool._id.toString());
    // Validate pool fields
    validateCoursePoolFields(scraperPool, dbPool, errorReporter);

    // Validate reference
    try {
      // validate that degree references this pool
      validateReference(dbDegree, 'coursePools', scraperPool._id);
    } catch (error) {
      errorReporter.addValidationFailure(
        'pool_reference',
        'valid reference',
        error.message,
        { poolId: scraperPool._id, dbPoolId: dbPool._id }
      );
    }

    // Check course existence
    for (const courseId of scraperPool.courses || []) {
      if (!courseSet.has(courseId.toString())) {
          errorReporter.addMissingEntity('Course', courseId, {
              degreeId,
              parentType: 'CoursePool',
              parentId: scraperPool._id
          });
      }
    }
  }
}

function validateCoursePrereqCoreqIntegrity(
  dbCourses,
  { degreeId, errorReporter },
) {
  // Helper function to report validation failures
  function reportValidationFailure(comparison, fieldName, courseId) {
    if (comparison.missing.length > 0) {
      errorReporter.addValidationFailure(
        'course_rules_missing',
        `${fieldName} requirements`,
        `Missing ${fieldName} requirements: ${JSON.stringify(comparison.missing)}`,
        { degreeId: degreeId, courseId, fieldName }
      );
      console.log(`Missing ${fieldName} requirements for course ${courseId}:`, comparison.missing);
    }
    
    if (comparison.extra.length > 0) {
      errorReporter.addValidationFailure(
        'course_rules_extra',
        `${fieldName} requirements`,
        `Extra ${fieldName} requirements: ${JSON.stringify(comparison.extra)}`,
        { degreeId: degreeId, courseId, fieldName }
      );
      console.log(`Extra ${fieldName} requirements for course ${courseId}:`, comparison.extra);
    }
  }
  
  // Get all courses from database for this degree
  for (const dbCourse of dbCourses) {
    const courseId = dbCourse._id.toString();
    // Find expected course data using helper
    const expectedCourse = findExpectedCourseData(courseId);
    if (!expectedCourse) {
      continue; // Skip courses that don't match any catalog or not found
    }
    
    // Compare rules objects
    const dbRules = dbCourse.rules || { prereq: [], coreq: [], not_taken: [] };
    const expectedRules = expectedCourse.rules || { prereq: [], coreq: [], not_taken: [] };
    
    // Compare prereq (array of arrays)
    const prereqComparison = compareArraysOfArrays(
      dbRules.prereq || [], 
      expectedRules.prereq || []
    );
    reportValidationFailure(prereqComparison, 'prereq', courseId);

    // Compare coreq (array of arrays)
    const coreqComparison = compareArraysOfArrays(
      dbRules.coreq || [], 
      expectedRules.coreq || []
    );
    reportValidationFailure(coreqComparison, 'coreq', courseId);

    // Compare not_taken (simple array)
    const notTakenComparison = compareSimpleArrays(
      dbRules.not_taken || [], 
      expectedRules.not_taken || []
    );
    reportValidationFailure(notTakenComparison, 'not_taken', courseId);

  }
}

module.exports = { validateDegreeIntegrity };
