import Database from "@controllers/DBController/DBController";
import CourseTypes from "./course_types";

const log = console.log;

// Fetch all courses
async function getAllCourses(): Promise<CourseTypes.CourseInfo[] | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const result = await dbConn.request().query(`
                    SELECT c.code, c.title, c.credits, c.description, 
                           r.code1 AS requisite_code1, r.code2 AS requisite_code2, r.type AS requisite_type
                    FROM Course c
                    LEFT JOIN Requisite r ON c.code = r.code1 OR c.code = r.code2
                `);

      const courses = result.recordset;

      // Group requisites by course
      const coursesWithRequisites = courses.reduce((acc: any, course: any) => {
        let courseCode = course.code;
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

      // Return the courses with requisites
      return Object.values(coursesWithRequisites);
    } catch (error) {
      log("Error fetching courses with requisites\n", error);
    }
  }

  return undefined;
}

// Fetch a course by code
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

// Add a new course
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

// Remove a course by code
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

// Get courses by degree grouped into pools
async function getCoursesByDegreeGrouped(
  degreeId: string
): Promise<CourseTypes.CoursePoolInfo[] | undefined> {
  const dbConn = await Database.getConnection();

  if (dbConn) {
    try {
      const query = `
                SELECT 
                    cp.id AS course_pool_id,
                    cp.name AS course_pool_name,
                    c.code, 
                    c.title,
                    c.credits, 
                    c.description,
                    r.code1 AS requisite_code1, 
                    r.code2 AS requisite_code2, 
                    r.group_id AS requisite_group_id,
                    r.type AS requisite_type
                FROM DegreeXCoursePool dxcp
                INNER JOIN CourseXCoursePool cxcp ON dxcp.coursepool = cxcp.coursepool
                INNER JOIN Course c ON cxcp.coursecode = c.code
                INNER JOIN CoursePool cp ON cxcp.coursepool = cp.id
                LEFT JOIN Requisite r ON c.code = r.code1
                WHERE dxcp.degree = @degreeId
                ORDER BY cp.name, c.code
            `;

      const result = await dbConn
        .request()
        .input("degreeId", Database.msSQL.VarChar, degreeId)
        .query(query);

      const records = result.recordset;

      if (records.length === 0) {
        return undefined;
      }

      const coursePoolsMap: { [key: string]: CourseTypes.CoursePoolInfo } = {};

      records.forEach((record) => {
        const poolId = record.course_pool_id;
        const poolName = record.course_pool_name;

        if (!coursePoolsMap[poolId]) {
          coursePoolsMap[poolId] = {
            poolId: poolId,
            poolName: poolName,
            courses: [],
          };
        }

        let course = coursePoolsMap[poolId].courses.find(
          (c) => c.code === record.code
        );
        if (!course) {
          course = {
            code: record.code,
            title: record.title,
            credits: record.credits,
            description: record.description,
            requisites: [],
          };
          coursePoolsMap[poolId].courses.push(course);
        }

        if (record.requisite_code1 && record.requisite_code2) {
          course.requisites.push({
            code1: record.requisite_code1,
            code2: record.requisite_code2,
            group_id: record.requisite_group_id,
            type: record.requisite_type,
          });
        }
      });

      return Object.values(coursePoolsMap);
    } catch (error) {
      log("Error fetching courses by degree grouped by course pools\n", error);
    }
  }

  return undefined;
}

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
