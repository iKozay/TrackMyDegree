const { Degree } = require('@models/degree');
const { CoursePool } = require('@models/coursepool');
const { Course } = require('@models/course');
const {
  validateFields,
  validateArrayFields,
  validateReference,
} = require('./validationHelpers');
const { ValidationErrorReporter } = require('./errorReporter');
/*
  * Helper functions to validate degree integrity against the database
  * Ensures that all referenced course pools and courses exist
  * and that all fields match between the scraped data and the database records
  * Uses batch queries and lookup maps for efficiency
 */

// Main function to validate degree integrity
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
  const poolSet = new Set(dbPools.map((p) => p._id.toString()));
  const courseSet = new Set(dbCourses.map((c) => c._id.toString()));
  const poolMap = new Map(dbPools.map((p) => [p._id.toString(), p]));

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
    poolSet,
    poolMap,
    courseSet,
    dbDegree,
    errorReporter,
    degreeId: degree._id,
  });

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
      { poolId: scraperPool._id },
    );
  }
}
// validate integrity of course pools within a degree using pre-fetched data from batch queries
function validateCoursePoolIntegrity(
  course_pool,
  { poolSet, poolMap, courseSet, dbDegree, errorReporter, degreeId },
) {
  // Validate course pools existence
  if (!course_pool || !Array.isArray(course_pool)) return;
  // Iterate through each course pool in the degree data
  for (const scraperPool of course_pool) {
    // Get pool ID string from scraper data
    const poolIdStr = scraperPool._id.toString();
    if (!poolSet.has(poolIdStr)) {
      errorReporter.addMissingEntity('CoursePool', scraperPool._id, {
        degreeId,
      });
      continue;
    }
    // Get corresponding DB pool
    const dbPool = poolMap.get(poolIdStr);

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
        { poolId: scraperPool._id },
      );
    }

    // Check course existence
    for (const courseId of scraperPool.courses || []) {
      if (!courseSet.has(courseId.toString())) {
        errorReporter.addMissingEntity('Course', courseId, {
          poolId: scraperPool._id,
        });
      }
    }
  }
}

module.exports = { validateDegreeIntegrity };
