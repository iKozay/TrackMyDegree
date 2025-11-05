/**
 * Purpose:
 *  - Course controller responsible for managing courses and their requisites.
 *    Provides functions to fetch, add, delete, and group courses
 * Notes:
 *  - Integrates Redis for caching heavy queries (getAll, byDegree, etc.).
 *  - Relies on DBController for SQL Server interactions
 *  - Sentry is used for eror tracking and monitoring.
 *  - Types (e.g., CourseTypes.CourseInfo) are imported from course_types.d.ts.
 */

import Database from '@controllers/DBController/DBController';
import CourseTypes from './course_types';
import * as Sentry from '@sentry/node';
import redisClient from '@controllers/redisClient';

const log = console.log;

const ERROR_READING_FROM_REDIS = 'Error reading from Redis cache';
const ERROR_WRITING_TO_REDIS = 'Error writing to Redis cache';

async function getFromCache(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (err) {
    Sentry.captureException(new Error('Error getting cache'));
    console.error('Error getting cache:', err);
    return null;
  }
}

async function setCache(
  key: string,
  value: string,
  ttl: number,
): Promise<void> {
  try {
    await redisClient.setEx(key, ttl, value);
  } catch (err) {
    Sentry.captureException(new Error('Error setting cache'));
    console.error('Error setting cache:', err);
  }
}

/**
 * Retrieves all courses along with their requisites,
 * using Redis caching.
 *
 * @returns {Promise<CourseTypes.CourseInfo[] | undefined>} - List of courses or undefined if an error occurs.
 */
async function getAllCourses(): Promise<CourseTypes.CourseInfo[] | undefined> {
  const cacheKey = 'getAllCourses';

  // Try to fetch from cache first
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      log('Serving getAllCourses from Redis cache');
      return JSON.parse(cachedData) as CourseTypes.CourseInfo[];
    }
  } catch (cacheError) {
    Sentry.captureException(new Error(ERROR_READING_FROM_REDIS));
    log(ERROR_READING_FROM_REDIS, cacheError);
    // Proceed to query the database if cache fails
  }

  const dbConn = await Database.getConnection();
  if (dbConn) {
    try {
      const result = await dbConn.request().query(`
        SELECT 
            c._id, 
            c.title, 
            c.credits, 
            c.description,
            c.offeredIn,
            req.requisite_code1, 
            req.requisite_code2, 
            req.requisite_type
        FROM Course c
        LEFT JOIN (
            SELECT code1 AS requisite_code1, code2 AS requisite_code2, type AS requisite_type
            FROM Requisite
            UNION ALL
            SELECT code2 AS requisite_code1, code1 AS requisite_code2, type AS requisite_type
            FROM Requisite
        ) req ON c._id = req.requisite_code1
      `);

      const courses = result.recordset;

      const coursesWithRequisites = courses.reduce((acc: any, course: any) => {
        const courseCode = course._id;
        if (!acc[courseCode]) {
          acc[courseCode] = {
            code: course._id,
            title: course.title,
            credits: course.credits,
            description: course.description,
            offeredIn: course.offeredIn,
            requisites: [],
          };
        }

        // Only pushes requisites when both code1 and code2 exist.
        // If there is a requisite with only one side populated it will be skipped.

        if (course.requisite_code1 && course.requisite_code2) {
          acc[courseCode].requisites.push({
            code1: course.requisite_code1,
            code2: course.requisite_code2,
            type: course.requisite_type,
          });
        }
        return acc;
      }, {});

      const resultData = Object.values(
        coursesWithRequisites,
      ) as CourseTypes.CourseInfo[];

      // Cache the result for 1 hour (3600 seconds)
      try {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(resultData));
      } catch (cacheError) {
        Sentry.captureException(new Error(ERROR_WRITING_TO_REDIS));
        log(ERROR_WRITING_TO_REDIS, cacheError);
      }

      return resultData;
    } catch (error) {
      Sentry.captureException(
        new Error('Error fetching courses with requisites'),
      );
      log('Error fetching courses with requisites\n', error);
    }
  }

  return undefined;
}

/**
 * Retrieves a specific course by its unique code.
 *
 * @param {string} code - The course code to search for.
 * @returns {Promise<CourseTypes.CourseInfo | undefined>} - The course details, or undefined if not found.
 */
async function getCourseByCode(
  code: string,
): Promise<CourseTypes.CourseInfoDB | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      // Fetch course details
      const courseResult = await dbConn
        .request()
        .input('code', Database.msSQL.VarChar, code)
        .query(
          'SELECT code, title, credits, description, offeredIn FROM Course WHERE code = @code',
        );

      const course = courseResult.recordset[0];
      if (!course) {
        return undefined;
      }

      // Fetch requisites
      const requisitesResult = await dbConn
        .request()
        .input('code', Database.msSQL.VarChar, code).query(`
                    SELECT r.type, r._id2 AS requisiteCode, c.description AS requisiteDescription
                    FROM Requisite r
                    INNER JOIN Course c ON r._id2 = c._id
                    WHERE r._id1 = @code
                `);

      // Construct course object with requisites
      return {
        code: course._id,
        title: course.title,
        credits: course.credits,
        description: course.description,
        offeredIn: course.offeredIn,
        requisites: requisitesResult.recordset.map((row: any) => ({
          type: row.type,
          code: row.requisiteCode,
          description: row.requisiteDescription,
        })),
      };
    } catch (error) {
      Sentry.captureException(new Error('Error fetching course by code'));
      console.error('Error fetching course by code\n', error);
    }
  }

  return undefined;
}

/**
 * Adds a new course to the database.
 *
 *
 * @param {CourseTypes.CourseInfo} courseInfo - The course details.
 * @returns {Promise<{ code: string } | undefined>} - The inserted course's code, or undefined on failure.
 */
async function addCourse(
  courseInfo: CourseTypes.CourseInfo,
): Promise<{ code: string } | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    const { code, title, credits, description } = courseInfo;

    // using a boolean check for credits will reject 0. Although I believe 0 credit courses do not exist
    // non credits courses may be confused with and hence rejected
    // consider checking credits == null instead.
    if (!code || !title || !credits || !description) {
      throw new Error('Missing required course data');
    }

    try {
      const result = await dbConn
        .request()
        .input('code', Database.msSQL.VarChar, code)
        .input('title', Database.msSQL.VarChar, title)
        .input('credits', Database.msSQL.Int, credits)
        .input('offeredIn', Database.msSQL.VarChar, courseInfo.offeredIn)
        .input('description', Database.msSQL.VarChar, description).query(`
                    INSERT INTO Course (code, title, credits, description, offeredIn)
                    OUTPUT INSERTED._id
                    VALUES (@code, @title, @credits, @description, @offeredIn)
                `);

      return result.recordset[0];
    } catch (error) {
      Sentry.captureException(new Error('Error adding course'));
      log('Error adding course\n', error);
    }
  }

  return undefined;
}

/**
 * Deletes a course from the database.
 *
 *
 * @param {string} code - The course code to delete.
 * @returns {Promise<boolean>} - True if deleted successfully, false otherwise.
 */
async function removeCourse(code: string): Promise<boolean> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const result = await dbConn
        .request()
        .input('code', Database.msSQL.VarChar, code)
        .query('DELETE FROM Course WHERE code = @code');

      return result.rowsAffected[0] > 0;
    } catch (error) {
      Sentry.captureException(new Error('Error removing course'));
      console.error('Error removing course\n', error);
      throw error;
    }
  }

  return false;
}

/**
 * Retrieves courses grouped by course pools for a given degree,
 * using Redis caching.
 *
 * @param {string} degreeId - The ID of the degree.
 * @returns {Promise<CourseTypes.CoursePoolInfo[] | undefined>} - The grouped courses, or undefined on failure.
 */
async function getCoursesByDegreeGrouped(
  degreeId: string,
): Promise<CourseTypes.CoursePoolInfo[] | undefined> {
  const cacheKey = `coursesByDegreeGrouped:${degreeId}`;

  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      log('Serving getCoursesByDegreeGrouped from Redis cache');
      return JSON.parse(cachedData) as CourseTypes.CoursePoolInfo[];
    }
  } catch (cacheError) {
    Sentry.captureException(new Error(ERROR_READING_FROM_REDIS));
    log(ERROR_READING_FROM_REDIS, cacheError);
    // Continue to query the database if cache read fails
  }

  const dbConn = await Database.getConnection();
  if (!dbConn) return undefined;

  try {
    const query = `
      WITH Courses AS (
        SELECT 
          cp.id AS course_pool_id, 
          cp.name AS course_pool_name, 
          c._id, 
          c.title, 
          c.credits, 
          c.description,
          c.offeredIn
        FROM DegreeXCoursePool dxcp
        INNER JOIN CourseXCoursePool cxcp ON dxcp.coursepool = cxcp.coursepool
        INNER JOIN Course c ON cxcp.coursecode = c._id
        INNER JOIN CoursePool cp ON cxcp.coursepool = cp.id
        WHERE dxcp.degree = @degreeId
      )
      SELECT 
        c.course_pool_id, 
        c.course_pool_name, 
        c._id, 
        c.title, 
        c.credits, 
        c.description,
        c.offeredIn,
        ISNULL(
          (SELECT 
             r._id1, 
             r._id2, 
             r.group_id, 
             r.type
           FROM Requisite r
           WHERE r._id1 = c._id
           FOR JSON PATH
          ), '[]'
        ) AS requisites_json
      FROM Courses c
      ORDER BY c.course_pool_name, c._id;
    `;

    const result = await dbConn
      .request()
      .input('degreeId', Database.msSQL.VarChar, degreeId)
      .query(query);

    const records = result.recordset;
    if (records.length === 0) return undefined;

    const coursePoolsMap: { [key: string]: CourseTypes.CoursePoolInfo } = {};

    records.forEach((record: any) => {
      let requisites: any[] = [];
      try {
        requisites = JSON.parse(record.requisites_json);
      } catch (e) {
        requisites = [];
      }
      const poolId = record.course_pool_id;
      if (!coursePoolsMap[poolId]) {
        coursePoolsMap[poolId] = {
          poolId: poolId,
          poolName: record.course_pool_name,
          courses: [],
        };
      }

      // Create a course object with its requisites
      const course = {
        code: record._id,
        title: record.title,
        credits: record.credits,
        description: record.description,
        offeredIn: record.offeredIn,
        requisites: requisites,
      };

      coursePoolsMap[poolId].courses.push(course);
    });

    const resultData = Object.values(coursePoolsMap);

    try {
      // Cache the result in Redis for 3600 seconds (1 hour)
      // This comment above says 1 hour but in reality I believe they later extended to 604800s (1 week)
      // We may change TTL if needed
      await redisClient.setEx(cacheKey, 604800, JSON.stringify(resultData));
    } catch (cacheError) {
      Sentry.captureException(new Error(ERROR_WRITING_TO_REDIS));
      log(ERROR_WRITING_TO_REDIS, cacheError);
    }

    return resultData;
  } catch (error) {
    Sentry.captureException(
      new Error('Error fetching courses by degree grouped by course pools'),
    );
    log('Error fetching courses by degree grouped by course pools\n', error);
  }

  return undefined;
}

/**
 * Retrieves all courses from the database, including their requisites,
 * using Redis caching.
 *
 * @returns {Promise<CourseTypes.CourseInfo[] | undefined>} - A list of courses with their requisite information, or undefined on failure.
 */
async function getAllCoursesInDB(): Promise<
  CourseTypes.CourseInfo[] | undefined
> {
  const cacheKey = 'getAllCoursesInDB';

  // Try to fetch from Redis cache first
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      log('Serving getAllCoursesInDB from Redis cache');
      return JSON.parse(cachedData) as CourseTypes.CourseInfo[];
    }
  } catch (cacheError) {
    Sentry.captureException(new Error(ERROR_READING_FROM_REDIS));
    log(ERROR_READING_FROM_REDIS, cacheError);
    // Continue to query the database if cache fails
  }

  const dbConn = await Database.getConnection();
  if (dbConn) {
    try {
      const result = await dbConn.request().query(`
        SELECT 
            c._id, 
            c.title,
            c.credits, 
            c.description,
            c.offeredIn,
            r._id1 AS requisite_code1, 
            r._id2 AS requisite_code2, 
            r.group_id AS requisite_group_id,
            r.type AS requisite_type
        FROM Course c
        LEFT JOIN Requisite r ON c._id = r._id1
        ORDER BY c._id
      `);

      const records = result.recordset;
      if (!records || records.length === 0) {
        return undefined;
      }

      // Build a map keyed by course code
      const coursesMap: { [key: string]: CourseTypes.CourseInfoDB } = {};

      records.forEach((record: any) => {
        const courseCode = record._id;
        if (!coursesMap[courseCode]) {
          coursesMap[courseCode] = {
            code: record._id,
            title: record.title,
            credits: record.credits,
            description: record.description,
            offeredIn: record.offeredIn,
            requisites: [],
          };
        }
        // Add requisite information if available
        if (record.requisite_code1 && record.requisite_code2) {
          coursesMap[courseCode].requisites.push({
            code1: record.requisite_code1,
            code2: record.requisite_code2,
            group_id: record.requisite_group_id,
            type: record.requisite_type,
          });
        }
      });

      const resultData = Object.values(coursesMap) as CourseTypes.CourseInfo[];

      // Cache the result in Redis for 1 hour (3600 seconds)
      // Also 1 week here
      try {
        await redisClient.setEx(cacheKey, 604800, JSON.stringify(resultData));
      } catch (cacheError) {
        Sentry.captureException(new Error(ERROR_WRITING_TO_REDIS));
        log(ERROR_WRITING_TO_REDIS, cacheError);
      }

      return resultData;
    } catch (error) {
      Sentry.captureException(new Error('Error fetching all courses'));
      log('Error fetching all courses\n', error);
    }
  }

  return undefined;
}

const courseController = {
  getAllCourses,
  getCourseByCode,
  addCourse,
  removeCourse,
  getCoursesByDegreeGrouped,
  getAllCoursesInDB,
};

export default courseController;
