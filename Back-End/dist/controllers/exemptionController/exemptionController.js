"use strict";
/**
 * Purpose:
 *  - Controller module for the Exemption table.
 *  - Provides functions to create, read, and delete exemptions for users and courses.
 * Notes:
 *  - Uses type definitions from exemption_types.d.ts for Exemption shape.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions return empty arrays.
 *  - Keeps track of exemptions that already exist to avoid duplicates.
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
 * Creates exemptions for a list of courses for a specific user.
 * Exemptions mean the user does not need to take those courses.
 * @param {string[]} coursecodes - Array of course codes for which exemptions are to be created.
 * @param {string} user_id - The ID of the user for whom the exemptions are created.
 * @returns {Promise<{ created: ExemptionTypes.Exemption[]; alreadyExists: string[] }>} - An object containing a list of created exemptions and a list of course codes that already have exemptions.
 */
function createExemptions(coursecodes, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        const createdExemptions = [];
        const alreadyExists = [];
        if (conn) {
            try {
                // Step 1: Confirm the user exists before creating exemptions for them.
                const existingUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (existingUser.recordset.length === 0) {
                    throw new Error(`AppUser with id '${user_id}' does not exist.`);
                }
                // Step 2: Loop through each course code provided.
                for (const coursecode of coursecodes) {
                    // Check if the course exists
                    const existingCourse = yield conn
                        .request()
                        .input('code', DBController_1.default.msSQL.VarChar, coursecode)
                        .query('SELECT * FROM Course WHERE code = @code');
                    if (existingCourse.recordset.length === 0) {
                        throw new Error(`Course with code '${coursecode}' does not exist.`);
                    }
                    // Check if the exemption already exists for this user + course.
                    const existingExemption = yield conn
                        .request()
                        .input('coursecode', DBController_1.default.msSQL.VarChar, coursecode)
                        .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                        .query('SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');
                    if (existingExemption.recordset.length > 0) {
                        // Instead of throwing an error, add the coursecode to the alreadyExists array and continue.
                        alreadyExists.push(coursecode);
                        continue;
                    }
                    // If it’s a new exemption → create a unique ID.
                    const id = (0, crypto_1.randomUUID)();
                    // Insert the exemption record into the database.
                    yield conn
                        .request()
                        .input('id', DBController_1.default.msSQL.VarChar, id)
                        .input('coursecode', DBController_1.default.msSQL.VarChar, coursecode)
                        .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                        .query('INSERT INTO Exemption (id, coursecode, user_id) VALUES (@id, @coursecode, @user_id)');
                    // Add to our "created" results array.
                    createdExemptions.push({ id, coursecode, user_id });
                }
                // Return both the newly created exemptions and the ones that already existed.
                return { created: createdExemptions, alreadyExists };
            }
            catch (error) {
                Sentry.captureException(error);
                throw error;
            }
            finally {
                conn.close();
            }
        }
        // In case no connection is made, just return empty arrays.
        return { created: [], alreadyExists: [] };
    });
}
/**
 * Retrieves all exemptions associated with a specific user.
 * Useful to display which courses the student doesn’t need to complete.
 *
 * @param {string} user_id - The ID of the user whose exemptions are to be fetched.
 * @returns {Promise<ExemptionTypes.Exemption[] | undefined>} - A list of exemptions associated with the user, or undefined if none found.
 */
function getAllExemptionsByUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Check if a appUser exists
                const existingUser_id = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (existingUser_id.recordset.length === 0) {
                    throw new Error(`AppUser with id '${user_id}' does not exist.`);
                }
                // Read all exemptions of a user
                const allExemptions = yield conn
                    .request()
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM Exemption WHERE user_id = @user_id');
                if (allExemptions.recordset.length === 0) {
                    throw new Error(`No exemptions found for user with id '${user_id}'.`);
                }
                return allExemptions.recordset;
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
/**
 * Deletes an exemption for a specific course and user.
 * Used when an exemption was wrongly added or revoked.
 * @param {string} coursecode - The course code for which the exemption should be deleted.
 * @param {string} user_id - The ID of the user for whom the exemption is being deleted.
 * @returns {Promise<string | undefined>} - A success message if the exemption was deleted, or undefined if no exemption was found.
 */
function deleteExemptionByCoursecodeAndUserId(coursecode, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Step 1: Check that the exemption exists before trying to delete it.
                const exemption = yield conn
                    .request()
                    .input('coursecode', DBController_1.default.msSQL.VarChar, coursecode)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');
                if (exemption.recordset.length === 0) {
                    throw new Error('Exemption with this coursecode and user_id does not exist.');
                }
                // Step 2: Delete the exemption record.
                yield conn
                    .request()
                    .input('coursecode', DBController_1.default.msSQL.VarChar, coursecode)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('DELETE FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');
                // Step 3: Return a success message for logging/UI.
                return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
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
// Group everything in one object for export.
const exemptionController = {
    createExemptions,
    getAllExemptionsByUser,
    deleteExemptionByCoursecodeAndUserId,
};
exports.default = exemptionController;
