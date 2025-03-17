import Database from "@controllers/DBController/DBController";
import CourseTypes from "./course_types";

const log = console.log;

/**
 * Retrieves all courses along with their requisites.
 * 
 * @returns {Promise<CourseTypes.CourseInfo[] | undefined>} - List of courses or undefined if an error occurs.
 */
async function getAllCourses(): Promise<CourseTypes.CourseInfo[] | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const result = await dbConn.request().query(`
        SELECT 
            c.code, 
            c.title, 
            c.credits, 
            c.description,
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
        ) req ON c.code = req.requisite_code1
      `);

      const courses = result.recordset;

      // Group requisites by course
      const coursesWithRequisites = courses.reduce((acc: any, course: any) => {
        const courseCode = course.code;
        if (!acc[courseCode]) {
          acc[courseCode] = {
            code: course.code,
            title: course.title,
            credits: course.credits,
            description: course.description,
            requisites: [],
          };
        }

        if (course.requisite_code1 && course.requisite_code2) {
          acc[courseCode].requisites.push({
            code1: course.requisite_code1,
            code2: course.requisite_code2,
            type: course.requisite_type,
          });
        }
        return acc;
      }, {});

      return Object.values(coursesWithRequisites);
    } catch (error) {
      log("Error fetching courses with requisites\n", error);
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
  code: string
): Promise<CourseTypes.CourseInfo | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      // Fetch course details
      const courseResult = await dbConn
        .request()
        .input("code", Database.msSQL.VarChar, code)
        .query(
          "SELECT code, title, credits, description FROM Course WHERE code = @code"
        );

      const course = courseResult.recordset[0];
      if (!course) {
        return undefined;
      }

      // Fetch requisites
      const requisitesResult = await dbConn
        .request()
        .input("code", Database.msSQL.VarChar, code).query(`
                    SELECT r.type, r.code2 AS requisiteCode, c.description AS requisiteDescription
                    FROM Requisite r
                    INNER JOIN Course c ON r.code2 = c.code
                    WHERE r.code1 = @code
                `);

      // Construct course object with requisites
      return {
        code: course.code,
        title: course.title,
        credits: course.credits,
        description: course.description,
        requisites: requisitesResult.recordset.map((row: any) => ({
          type: row.type,
          code: row.requisiteCode,
          description: row.requisiteDescription,
        })),
      };
    } catch (error) {
      console.error("Error fetching course by code\n", error);
    }
  }

  return undefined;
}

/**
 * Adds a new course to the database.
 * 
 * @param {CourseTypes.CourseInfo} courseInfo - The course details.
 * @returns {Promise<{ code: string } | undefined>} - The inserted course's code, or undefined on failure.
 */
async function addCourse(
  courseInfo: CourseTypes.CourseInfo
): Promise<{ code: string } | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    const { code, title, credits, description } = courseInfo;

    if (!code || !title || !credits || !description) {
      throw new Error("Missing required course data");
    }

    try {
      const result = await dbConn
        .request()
        .input("code", Database.msSQL.VarChar, code)
        .input("title", Database.msSQL.VarChar, title)
        .input("credits", Database.msSQL.Int, credits)
        .input("description", Database.msSQL.VarChar, description).query(`
                    INSERT INTO Course (code, title, credits, description)
                    OUTPUT INSERTED.code
                    VALUES (@code, @title, @credits, @description)
                `);

      return result.recordset[0];
    } catch (error) {
      log("Error adding course\n", error);
    }
  }

  return undefined;
}

/**
 * Deletes a course from the database.
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
        .input("code", Database.msSQL.VarChar, code)
        .query("DELETE FROM Course WHERE code = @code");

      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error("Error removing course\n", error);
      throw error;
    }
  }

  return false;
}

/**
 * Retrieves courses grouped by course pools for a given degree.
 * 
 * @param {string} degreeId - The ID of the degree.
 * @returns {Promise<CourseTypes.CoursePoolInfo[] | undefined>} - The grouped courses, or undefined on failure.
 */
async function getCoursesByDegreeGrouped(
  degreeId: string
): Promise<CourseTypes.CoursePoolInfo[] | undefined> {
  const dbConn = await Database.getConnection();
  if (!dbConn) return undefined;

  try {
    const query = `
      WITH Courses AS (
        SELECT 
          cp.id AS course_pool_id, 
          cp.name AS course_pool_name, 
          c.code, 
          c.title, 
          c.credits, 
          c.description
        FROM DegreeXCoursePool dxcp
        INNER JOIN CourseXCoursePool cxcp ON dxcp.coursepool = cxcp.coursepool
        INNER JOIN Course c ON cxcp.coursecode = c.code
        INNER JOIN CoursePool cp ON cxcp.coursepool = cp.id
        WHERE dxcp.degree = @degreeId
      )
      SELECT 
        c.course_pool_id, 
        c.course_pool_name, 
        c.code, 
        c.title, 
        c.credits, 
        c.description,
        ISNULL(
          (SELECT 
             r.code1, 
             r.code2, 
             r.group_id, 
             r.type
           FROM Requisite r
           WHERE r.code1 = c.code
           FOR JSON PATH
          ), '[]'
        ) AS requisites_json
      FROM Courses c
      ORDER BY c.course_pool_name, c.code;
    `;

    const result = await dbConn
      .request()
      .input("degreeId", Database.msSQL.VarChar, degreeId)
      .query(query);

    const records = result.recordset;
    if (records.length === 0) return undefined;

    const coursePoolsMap: { [key: string]: CourseTypes.CoursePoolInfo } = {};

    records.forEach((record: any) => {
      // Parse the JSON array of requisites
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
        code: record.code,
        title: record.title,
        credits: record.credits,
        description: record.description,
        requisites: requisites,
      };

      coursePoolsMap[poolId].courses.push(course);
    });

    return Object.values(coursePoolsMap);
  } catch (error) {
    log("Error fetching courses by degree grouped by course pools\n", error);
  }

  return undefined;
}

/**
 * Retrieves all courses from the database, including their requisites.
 *
 * @returns {Promise<CourseTypes.CourseInfo[] | undefined>} - A list of courses with their requisite information, or undefined on failure.
 */
async function getAllCoursesInDB(): Promise<
  CourseTypes.CourseInfo[] | undefined
> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const result = await dbConn.request().query(`
                SELECT 
                    c.code, 
                    c.title,
                    c.credits, 
                    c.description,
                    r.code1 AS requisite_code1, 
                    r.code2 AS requisite_code2, 
                    r.group_id AS requisite_group_id,
                    r.type AS requisite_type
                FROM Course c
                LEFT JOIN Requisite r ON c.code = r.code1
                ORDER BY c.code
            `);

      const records = result.recordset;
      if (!records || records.length === 0) {
        return undefined;
      }

      // Build a map keyed by course code
      const coursesMap: { [key: string]: CourseTypes.CourseInfo } = {};

      records.forEach((record) => {
        const courseCode = record.code;
        if (!coursesMap[courseCode]) {
          coursesMap[courseCode] = {
            code: record.code,
            title: record.title,
            credits: record.credits,
            description: record.description,
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

      return Object.values(coursesMap);
    } catch (error) {
      log("Error fetching all courses\n", error);
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
