import Database from "@controllers/DBController/DBController";
import CourseTypes from "./course_types";

const log = console.log;

// Fetch all courses
async function getAllCourses(): Promise<CourseTypes.CourseInfo[] | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            const result = await dbConn.request().query('SELECT * FROM Course');
            return result.recordset;
        } catch (error) {
            log("Error fetching courses\n", error);
        }
    }

    return undefined;
}

// Fetch a course by code and number
async function getCourseByCode(code: string): Promise<CourseTypes.CourseInfo | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            const result = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .query('SELECT * FROM Course WHERE code = @code');

            return result.recordset[0];
        } catch (error) {
            log("Error fetching course by code and number\n", error);
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
