import Database from "@controllers/DBController/DBController";
import CourseTypes from "./course_types";

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




const courseController = {
    getAllCourses,
    getCourseByCode,
    addCourse,
    removeCourse,
};

export default courseController;