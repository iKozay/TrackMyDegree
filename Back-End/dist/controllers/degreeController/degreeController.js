"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DBController_1 = __importDefault(require("@controllers/DBController/DBController"));
const node_1 = require("@sentry/node");
/**
 * Creates a new degree in the database.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The name of the degree.
 * @param {number} totalCredits - The total number of credits required to complete the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The created degree object or undefined if the operation fails.
 */
function createDegree(id, name, totalCredits) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a degree with the same id or name already exists
                const existingDegree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('name', DBController_1.default.msSQL.VarChar, name)
                    .query('SELECT * FROM Degree WHERE id = @id OR name = @name');
                if (existingDegree.recordset.length > 0) {
                    throw new Error('Degree with this id or name already exists.');
                }
                yield conn
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
    });
}
/**
 * Retrieves a degree by its ID.
 *
 * @param {string} id - The unique identifier for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The degree object or undefined if the degree is not found.
 */
function readDegree(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a degree with the id exists
                const degree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM Degree WHERE id = @id');
                if (degree.recordset.length === 0) {
                    throw new Error('Degree with this id does not exist.');
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
    });
}
/**
 * Retrieves all degrees from the database.
 *
 * @returns {Promise<DegreeTypes.Degree[] | undefined>} - A list of all degrees or undefined if no degrees are found.
 */
function readAllDegrees() {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                const degrees = yield conn
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
    });
}
/**
 * Updates an existing degree with new information.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The new name of the degree.
 * @param {number} totalCredits - The new total credits for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The updated degree object or undefined if the update fails.
 */
function updateDegree(id, name, totalCredits) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a degree with the id exists
                const degree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM Degree WHERE id = @id');
                if (degree.recordset.length === 0) {
                    throw new Error('Degree with this id does not exist.');
                }
                // Update the degree with the new name and totalCredits
                yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('fullname', DBController_1.default.msSQL.VarChar, name)
                    .input('totalCredits', DBController_1.default.msSQL.Int, totalCredits)
                    .query('UPDATE Degree SET name = @fullname, totalCredits = @totalCredits WHERE id = @id');
                // Return the updated degree
                const updatedDegree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM Degree WHERE id = @id');
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
    });
}
/**
 * Deletes a degree from the database by its ID.
 *
 * @param {string} id - The unique identifier for the degree to delete.
 * @returns {Promise<string | undefined>} - A success message if the degree is deleted or undefined if the deletion fails.
 */
function deleteDegree(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a degree with the given id exists
                const degree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM Degree WHERE id = @id');
                if (degree.recordset.length === 0) {
                    throw new Error('Degree with this id does not exist.');
                }
                // Delete the degree
                yield conn
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
    });
}
function getCreditsForDegree(degreeId) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a degree with the id exists
                const degree = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, degreeId)
                    .query('SELECT * FROM Degree WHERE id = @id');
                if (degree.recordset.length === 0) {
                    throw new Error('Degree with this id does not exist.');
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
    });
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
