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
async function getCourseByCodeAndNumber(code: string, number: number): Promise<CourseTypes.CourseInfo | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            const result = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .input('number', Database.msSQL.Int, number)
                .query('SELECT * FROM Course WHERE code = @code AND number = @number');

            return result.recordset[0];
        } catch (error) {
            log("Error fetching course by code and number\n", error);
        }
    }

    return undefined;
}

// Add a new course
async function addCourse(courseInfo: CourseTypes.CourseInfo): Promise<{ code: string; number: number } | undefined> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        const { code, number, credits, description } = courseInfo;

        try {
            const result = await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .input('number', Database.msSQL.Int, number)
                .input('credits', Database.msSQL.Int, credits)
                .input('description', Database.msSQL.VarChar, description)
                .query(`
          INSERT INTO Course (code, number, credits, description)
          OUTPUT INSERTED.code, INSERTED.number
          VALUES (@code, @number, @credits, @description)
        `);

            return result.recordset[0];
        } catch (error) {
            log("Error adding course\n", error);
        }
    }

    return undefined;
}

// Remove a course by code and number
async function removeCourse(code: string, number: number): Promise<boolean> {
    const dbConn = await Database.getConnection();

    if (dbConn) {
        try {
            await dbConn.request()
                .input('code', Database.msSQL.VarChar, code)
                .input('number', Database.msSQL.Int, number)
                .query('DELETE FROM Course WHERE code = @code AND number = @number');

            return true;
        } catch (error) {
            log("Error removing course\n", error);
        }
    }

    return false;
}

const courseController = {
    getAllCourses,
    getCourseByCodeAndNumber,
    addCourse,
    removeCourse,
};

export default courseController;
