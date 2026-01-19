"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DBController_1 = __importDefault(require("../DBController/DBController"));
const node_1 = require("@sentry/node");
const SELECT_DEGREE_BY_ID = 'SELECT * FROM Degree WHERE id = @id';
const DEGREE_WITH_ID_DOES_NOT_EXIST = 'Degree with this id does not exist.';
/**
 * Creates a new degree in the database.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The name of the degree.
 * @param {number} totalCredits - The total number of credits required to complete the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The created degree object or undefined if the operation fails.
 */
async function createDegree(id, name, totalCredits) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Check if a degree with the same id or name already exists
            const existingDegree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('name', DBController_1.default.msSQL.VarChar, name)
                .query('SELECT * FROM Degree WHERE id = @id OR name = @name');
            if (existingDegree.recordset.length > 0) {
                throw new Error('Degree with this id or name already exists.');
            }
            await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('name', DBController_1.default.msSQL.VarChar, name)
                .input('totalCredits', DBController_1.default.msSQL.Int, totalCredits)
                .query('INSERT INTO Degree (id, name, totalCredits) VALUES (@id, @name, @totalCredits)');
            return { id, name, totalCredits };
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
/**
 * Retrieves a degree by its ID.
 *
 * @param {string} id - The unique identifier for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The degree object or undefined if the degree is not found.
 */
async function readDegree(id) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Check if a degree with the id exists
            const degree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .query(SELECT_DEGREE_BY_ID);
            if (degree.recordset.length === 0) {
                throw new Error(DEGREE_WITH_ID_DOES_NOT_EXIST);
            }
            return degree.recordset[0];
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
/**
 * Retrieves all degrees from the database.
 *
 * @returns {Promise<DegreeTypes.Degree[] | undefined>} - A list of all degrees or undefined if no degrees are found.
 */
async function readAllDegrees() {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            const degrees = await conn
                .request()
                .query("SELECT * FROM Degree WHERE id != 'ECP'");
            return degrees.recordset;
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
/**
 * Updates an existing degree with new information.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The new name of the degree.
 * @param {number} totalCredits - The new total credits for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The updated degree object or undefined if the update fails.
 */
async function updateDegree(id, name, totalCredits) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Check if a degree with the id exists
            const degree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .query(SELECT_DEGREE_BY_ID);
            if (degree.recordset.length === 0) {
                throw new Error(DEGREE_WITH_ID_DOES_NOT_EXIST);
            }
            // Update the degree with the new name and totalCredits
            await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('fullname', DBController_1.default.msSQL.VarChar, name)
                .input('totalCredits', DBController_1.default.msSQL.Int, totalCredits)
                .query('UPDATE Degree SET name = @fullname, totalCredits = @totalCredits WHERE id = @id');
            // Return the updated degree
            const updatedDegree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .query(SELECT_DEGREE_BY_ID);
            return updatedDegree.recordset[0];
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
/**
 * Deletes a degree from the database by its ID.
 *
 * @param {string} id - The unique identifier for the degree to delete.
 * @returns {Promise<string | undefined>} - A success message if the degree is deleted or undefined if the deletion fails.
 */
async function deleteDegree(id) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Check if a degree with the given id exists
            const degree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .query(SELECT_DEGREE_BY_ID);
            if (degree.recordset.length === 0) {
                throw new Error(DEGREE_WITH_ID_DOES_NOT_EXIST);
            }
            // Delete the degree
            await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .query('DELETE FROM Degree WHERE id = @id');
            // Return success message
            return `Degree with id ${id} has been successfully deleted.`;
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
async function getCreditsForDegree(degreeId) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Check if a degree with the id exists
            const degree = await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, degreeId)
                .query(SELECT_DEGREE_BY_ID);
            if (degree.recordset.length === 0) {
                throw new Error(DEGREE_WITH_ID_DOES_NOT_EXIST);
            }
            return degree.recordset[0].totalCredits;
        }
        catch (error) {
            (0, node_1.captureException)(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
//Namespace
const degreeController = {
    createDegree,
    readDegree,
    updateDegree,
    deleteDegree,
    readAllDegrees,
    getCreditsForDegree,
};
exports.default = degreeController;
//# sourceMappingURL=degreeController.js.map