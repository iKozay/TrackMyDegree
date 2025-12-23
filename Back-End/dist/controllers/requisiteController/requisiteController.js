"use strict";
/**
 * Purpose:
 *  - Controller module for the Requisite table.
 *  - Provides functions to create, read, update, and delete course requisites.
 * Notes:
 *  - Uses type definitions from requisite_types.d.ts for Requisite shape.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions return undefined.
 *  - Validates courses exist and prevents duplicate requisites.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
/**
 * Creates a new course requisite if it does not already exist.
 * Throws an error if either course does not exist or the requisite is duplicate.
 */
function createRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Generate a unique ID for this new requisite entry
                const id = (0, crypto_1.randomUUID)();
                // Make sure both courses exist in the Course table before linking them
                const coursesCheck = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2).query(`
          SELECT code
          FROM Course
          WHERE code IN (@code1, @code2);
        `);
                if (coursesCheck.recordset.length < 2) {
                    throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
                }
                // Check if this exact course-to-course requisite already exists to avoid duplicates
                const existingRequisite = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                if (existingRequisite.recordset.length > 0) {
                    throw new Error('Requisite with this combination of courses already exists.');
                }
                // Insert the new requisite into the database
                yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('INSERT INTO Requisite (id, code1, code2, type) VALUES (@id, @code1, @code2, @type)');
                return existingRequisite.recordset[0];
            }
            catch (error) {
                Sentry.captureException(error);
                throw error;
            }
            finally {
                conn.close();
            }
        }
    });
}
// This function fetches requisites for a given course.
// If code2 and type are also provided, it narrows the search further.
function readRequisite(code1, code2, // Make code2 optional
type) {
    return __awaiter(this, void 0, void 0, function* () {
        // Return an array of requisites
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Validate that code1 actually exists in the Course table
                const coursesCheck = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1).query(`
          SELECT code
          FROM Course
          WHERE code = @code1;
        `);
                if (coursesCheck.recordset.length < 1) {
                    throw new Error(`Course '${code1}' does not exist.`);
                }
                // If both code2 and type are provided, search using all parameters
                if (code2 && type) {
                    const existingRequisite = yield conn
                        .request()
                        .input('code1', DBController_1.default.msSQL.VarChar, code1)
                        .input('code2', DBController_1.default.msSQL.VarChar, code2)
                        .input('type', DBController_1.default.msSQL.VarChar, type)
                        .query('SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                    return existingRequisite.recordset; // Return all matching requisites
                }
                else {
                    // Otherwise, return all requisites where code1 is the first course
                    const existingRequisite = yield conn
                        .request()
                        .input('code1', DBController_1.default.msSQL.VarChar, code1)
                        .query('SELECT * FROM Requisite WHERE code1 = @code1');
                    return existingRequisite.recordset; // Return all requisites for code1
                }
            }
            catch (error) {
                Sentry.captureException(error);
                throw error;
            }
            finally {
                conn.close();
            }
        }
    });
}
// Update an existing requisite with new course and type values
function updateRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Confirm both courses exist before updating
                const coursesCheck = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2).query(`
          SELECT code
          FROM Course
          WHERE code IN (@code1, @code2);
        `);
                if (coursesCheck.recordset.length < 2) {
                    throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
                }
                // Check if the new combination already exists to prevent duplicates
                const existingRequisite = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                if (existingRequisite.recordset.length > 0) {
                    throw new Error('Requisite with this combination of courses already exists.');
                }
                // Update the requisite with the new attributes
                // Perform the update on the Requisite table
                yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('UPDATE Requisite SET code1 = @code1, code2 = @code2, type = @type WHERE id = @id');
                // Return the updated requisite
                // Fetch and return the updated requisite entry
                const updatedRequisite = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                return updatedRequisite.recordset[0];
            }
            catch (error) {
                Sentry.captureException(error);
                throw error;
            }
            finally {
                conn.close();
            }
        }
    });
}
// Delete a requisite if it exists for the given course combination and type
function deleteRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // First, check if this requisite actually exists
                const requisite = yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                if (requisite.recordset.length === 0) {
                    throw new Error('Requisite with this id does not exist.');
                }
                // If it exists, delete the entry from the table
                yield conn
                    .request()
                    .input('code1', DBController_1.default.msSQL.VarChar, code1)
                    .input('code2', DBController_1.default.msSQL.VarChar, code2)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query('DELETE FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type');
                // Confirm deletion with a success message
                return `Requisite with the course combination provided has been successfully deleted.`;
            }
            catch (error) {
                Sentry.captureException(error);
                throw error;
            }
            finally {
                conn.close();
            }
        }
    });
}
//Namespace
const requisiteController = {
    createRequisite,
    readRequisite,
    updateRequisite,
    deleteRequisite,
};
exports.default = requisiteController;
