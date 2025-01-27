import Database from "@controllers/DBController/DBController";
import CourseTypes from "./course_types";
import { group } from "console";

const log = console.log;

// Fetch all courses
async function getAllCourses(): Promise<CourseTypes.CourseInfo[] | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            const result = await dbConn.request()
                .query(`
                    SELECT c.code, c.credits, c.description, 
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
                        credits: course.credits,
                        description: course.description,
                        requisites: []
                    };
                }

                if (course.requisite_code1 && course.requisite_code2) {
                    acc[courseCode].requisites.push({
                        code1: course.requisite_code1,
                        code2: course.requisite_code2,
                        type: course.requisite_type
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


// Fetch a course by code and number
async function getCourseByCode(code: string): Promise<CourseTypes.CourseInfo | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            // Fetch course details
            const courseResult = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .query('SELECT * FROM Course WHERE code = @code');

            const course = courseResult.recordset[0];
            if (!course) {
                return undefined; // Course not found
            }

            // Fetch requisites (prerequisites and corequisites)
            const requisitesResult = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .query(`
                    SELECT r.type, r.code2 AS requisiteCode, c.description AS requisiteDescription
                    FROM Requisite r
                    INNER JOIN Course c ON r.code2 = c.code
                    WHERE r.code1 = @code
                `);

            // Attach requisites to the course
            course.requisites = requisitesResult.recordset.map((row: any) => ({
                type: row.type,
                code: row.requisiteCode,
                description: row.requisiteDescription,
            }));

            return course;
        } catch (error) {
            console.error("Error fetching course by code\n", error);
        }
    }

    return undefined;
}




// Add a new course
async function addCourse(courseInfo: CourseTypes.CourseInfo): Promise<{ code: string } | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        const { code, credits, description } = courseInfo;

        if (!code || !credits || !description) {
            throw new Error("Missing required course data");
        }

        try {
            const result = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .input('credits', Database.msSQL.Int, credits)
                .input('description', Database.msSQL.VarChar, description)
                .query(`
          INSERT INTO Course (code, credits, description)
          OUTPUT INSERTED.code
          VALUES (@code, @credits, @description)
        `);

            return result.recordset[0];
        } catch (error) {
            log("Error adding course\n", error);
        }
    }

    return undefined;
}

// Remove a course by code and number
async function removeCourse(code: string): Promise<boolean> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            const result = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .query('DELETE FROM Course WHERE code = @code');

            // Check if any rows were affected
            if (result.rowsAffected[0] === 0) {
                return false; // No course was found and deleted
            }

            return true; // Course was found and deleted
        } catch (error) {
            console.error("Error removing course\n", error);
            throw error;
        }
    }

    return false;
}

// Inside your courseController file

/**
 * Fetch courses associated with a specific degree, grouped by CoursePools.
 * @param degreeId - The ID of the degree.
 * @returns A list of CoursePoolInfo objects or undefined if an error occurs.
 */
async function getCoursesByDegreeGrouped(degreeId: string): Promise<CourseTypes.CoursePoolInfo[] | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            // SQL Query to fetch course pools and their associated courses for the specified degree
            const query = `
                SELECT 
                    cp.id AS course_pool_id,
                    cp.name AS course_pool_name,
                    c.code, 
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

            const result = await dbConn.request()
                .input('degreeId', Database.msSQL.VarChar, degreeId)
                .query(query);

            const records = result.recordset;

            if (records.length === 0) {
                return undefined; // No courses found for the specified degree
            }

            // Group courses by CoursePool
            const coursePoolsMap: { [key: string]: CourseTypes.CoursePoolInfo } = {};

            records.forEach(record => {
                const poolId = record.course_pool_id;
                const poolName = record.course_pool_name;

                if (!coursePoolsMap[poolId]) {
                    coursePoolsMap[poolId] = {
                        poolId: poolId,
                        poolName: poolName,
                        courses: []
                    };
                }

                // Check if the course already exists in the pool to handle multiple requisites
                let course = coursePoolsMap[poolId].courses.find(c => c.code === record.code);
                if (!course) {
                    course = {
                        code: record.code,
                        credits: record.credits,
                        description: record.description,
                        requisites: []
                    };
                    coursePoolsMap[poolId].courses.push(course);
                }

                // Add requisites if present
                if (record.requisite_code1 && record.requisite_code2) {
                    course.requisites.push({
                        code1: record.requisite_code1,
                        code2: record.requisite_code2,
                        group_id: record.requisite_group_id,
                        type: record.requisite_type
                    });
                }
            });

            // Convert the map to an array
            return Object.values(coursePoolsMap);
        } catch (error) {
            log("Error fetching courses by degree grouped by course pools\n", error);
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
};

export default courseController;