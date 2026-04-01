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
  const { degree, coursePools } = degreeData;
  const errorReporter = new ValidationErrorReporter();

  // Batch collect all IDs first
  const poolIds = degree.coursePools || [];
  const allCourseIds = coursePools?.flatMap((pool) => pool.courses || []) || [];

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
      degreeType: 'degreeType',
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
  validateCoursePoolIntegrity(coursePools, {
    poolMap,
    courseSet,
    dbDegree,
    errorReporter,
    degreeId: degree._id,
  });

  // Validate courses prerequisites and corequisites
  validateCourseRules(dbCourses, { degreeId: degree._id, errorReporter });
  
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
  coursePool,
  { poolMap, courseSet, dbDegree, errorReporter, degreeId },
) {
  // Validate course pools existence
  if (!coursePool || !Array.isArray(coursePool)) return;
  // Iterate through each course pool in the degree data
  for (const scraperPool of coursePool) {
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

function validateCourseRules(
  dbCourses,
  { degreeId, errorReporter },
) {
  // Helper function to normalize a rule for comparison
  function normalizeRule(rule) {
    // Convert to plain object to remove any proxy wrappers or circular references
    const plainRule = JSON.parse(JSON.stringify(rule));
    const { level, ...normalizedRule } = plainRule;
    return normalizedRule;
  }

  // Helper function to compare rules arrays
  function compareRulesArrays(dbRules, expectedRules) {
    const missing = [];
    const extra = [];

    // Normalize rules for comparison
    const normalizedDbRules = dbRules.map(normalizeRule);
    const normalizedExpectedRules = expectedRules.map(normalizeRule);

    // Helper function to create a consistent string representation for comparison
    // that is order-independent for object properties
    function ruleToComparableString(rule) {
      // Convert to plain object first to remove any proxy wrappers/circular refs
      const plainRule = JSON.parse(JSON.stringify(rule));

      // Recursively sort object keys and course arrays for consistent comparison
      function sortObjectKeys(obj, depth = 0, parentKey = '') {
        // Prevent deep nesting issues
        if (depth > 5) return obj;

        if (Array.isArray(obj)) {
          // Sort arrays that represent course lists for order-independent comparison
          if (parentKey === 'courseList' || obj.every(item => typeof item === 'string' && /^[A-Z]{4}\s+\d{3}$/.test(item))) {
            return obj.slice().sort().map(item => sortObjectKeys(item, depth + 1, ''));
          }
          return obj.map(item => sortObjectKeys(item, depth + 1, ''));
        } else if (obj !== null && typeof obj === 'object') {
          const sortedObj = {};
          Object.keys(obj).sort().forEach(key => {
            sortedObj[key] = sortObjectKeys(obj[key], depth + 1, key);
          });
          return sortedObj;
        } else if (typeof obj === 'string' && parentKey === 'message') {
          // Normalize course order in messages by extracting and sorting course codes
          const coursePattern = /[A-Z]{4}\s+\d{3}/g;
          const courses = obj.match(coursePattern);
          if (courses && courses.length > 1) {
            const sortedCourses = courses.slice().sort();
            let normalizedMessage = obj;
            // Replace course list with sorted version
            courses.forEach((course, i) => {
              normalizedMessage = normalizedMessage.replace(course, `__COURSE_${i}__`);
            });
            sortedCourses.forEach((course, i) => {
              normalizedMessage = normalizedMessage.replace(`__COURSE_${i}__`, course);
            });
            return normalizedMessage;
          }
        }
        return obj;
      }

      return JSON.stringify(sortObjectKeys(plainRule, 0, ''));
    }

    // Find missing rules (in expected but not in db)
    for (const expectedRule of normalizedExpectedRules) {
      const expectedRuleString = ruleToComparableString(expectedRule);
      const found = normalizedDbRules.some(dbRule =>
        ruleToComparableString(dbRule) === expectedRuleString
      );
      if (!found) {
        missing.push(expectedRule);
      }
    }

    // Find extra rules (in db but not in expected)
    for (const dbRule of normalizedDbRules) {
      const dbRuleString = ruleToComparableString(dbRule);
      const found = normalizedExpectedRules.some(expectedRule =>
        ruleToComparableString(expectedRule) === dbRuleString
      );
      if (!found) {
        extra.push(dbRule);
      }
    }

    return { missing, extra };
  }

  // Helper function to report validation failures
  function reportValidationFailure(comparison, fieldName, courseId) {
    if (comparison.missing.length > 0) {
      errorReporter.addValidationFailure(
        'course_rules_missing',
        `${fieldName} requirements`,
        `Missing ${fieldName} requirements in ${courseId}: ${JSON.stringify(comparison.missing)}`,
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

    // Compare rules arrays - new format is an array of rule objects
    const dbRules = dbCourse.rules || [];
    const expectedRules = expectedCourse.rules || [];

    // Compare rules arrays
    const rulesComparison = compareRulesArrays(dbRules, expectedRules);
    reportValidationFailure(rulesComparison, 'rules', courseId);
  }
}

module.exports = { validateDegreeIntegrity };
