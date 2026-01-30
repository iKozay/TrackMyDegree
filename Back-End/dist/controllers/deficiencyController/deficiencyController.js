"use strict";
/**
 * Purpose:
 *  - Controller module for the Deficiency table.
 *  - Provides functions to create, read, and delete deficiencies for users and course pools.
 * Notes:
 *  - Uses type definitions from deficiency_types.d.ts for Deficiency shape.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions return undefined silently.
 *  - Ensures no duplicate deficiencies are created.
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
 * Creates a new deficiency for a user and coursepool.
 * Deficiencies represent missing credits a student must complete.
 *
 * @param {string} coursepool - The ID of the course pool.
 * @param {string} user_id - The ID of the user.
 * @param {number} creditsRequired - The number of credits required to resolve the deficiency.
 * @returns {Promise<DeficiencyTypes.Deficiency | undefined>} - The created deficiency or undefined if failed.
 */
function createDeficiency(coursepool, user_id, creditsRequired) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Step 1: Check if this deficiency already exists (same coursepool + user). 
                // If yes, we don't create a duplicate → the user should update instead.
                const existingDeficiency = yield conn
                    .request()
                    .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id');
                if (existingDeficiency.recordset.length > 0) {
                    throw new Error('Deficiency with this coursepool and user_id already exists. Please use the update endpoint');
                }
                // Step 2: Make sure the course pool actually exists.
                const existingCoursePool = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, coursepool)
                    .query('SELECT * FROM CoursePool WHERE id = @id');
                if (existingCoursePool.recordset.length === 0) {
                    throw new Error('CoursePool does not exist.');
                }
                // Step 3: Make sure the user exists in the system.
                const existingAppUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (existingAppUser.recordset.length === 0) {
                    throw new Error('AppUser does not exist.');
                }
                // Step 4: Generate a unique ID for this new deficiency.
                const id = (0, crypto_1.randomUUID)();
                // Step 5: Insert the new deficiency into the database.
                yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .input('creditsRequired', DBController_1.default.msSQL.Int, creditsRequired)
                    .query('INSERT INTO Deficiency (id, coursepool, user_id, creditsRequired) VALUES (@id, @coursepool, @user_id, @creditsRequired)');
                // Return the object so the caller knows what was created.
                return { id, coursepool, user_id, creditsRequired };
            }
            catch (error) {
                // If something goes wrong, capture it with Sentry for monitoring.
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
 * Retrieves all deficiencies for a specific user.
 * This allows us to see which course pools still require credits.
 *
 * @param {string} user_id - The ID of the user.
 * @returns {Promise<DeficiencyTypes.Deficiency[] | undefined>} - List of deficiencies or undefined if not found.
 */
function getAllDeficienciesByUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // First, confirm that the user exists in the system.
                const existingAppUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (existingAppUser.recordset.length === 0) {
                    throw new Error('AppUser does not exist.');
                }
                // Fetch all deficiencies tied to this user.
                const allDeficiencies = yield conn
                    .request()
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM Deficiency WHERE user_id = @user_id');
                // Return the list if found, otherwise undefined.
                return allDeficiencies.recordset.length > 0
                    ? allDeficiencies.recordset
                    : undefined;
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
 * Deletes a deficiency based on course pool and user ID.
 * Useful if the deficiency is resolved or was created by mistake.
 *
 * @param {string} coursepool - The ID of the course pool.
 * @param {string} user_id - The ID of the user.
 * @returns {Promise<string | undefined>} - Success message or undefined if deletion fails.
 */
function deleteDeficiencyByCoursepoolAndUserId(coursepool, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        if (conn) {
            try {
                // Step 1: Make sure the deficiency actually exists before deleting.
                const deficiency = yield conn
                    .request()
                    .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('SELECT * FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id');
                if (deficiency.recordset.length === 0) {
                    throw new Error('Deficiency with this id does not exist.');
                }
                // Step 2: Delete the deficiency record.
                yield conn
                    .request()
                    .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool)
                    .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                    .query('DELETE FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id');
                // Step 3: Return a success message.
                return `Deficiency with appUser ${user_id} and coursepool ${coursepool} has been successfully deleted.`;
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
// Export the functions in a namespace-like object so they can be used elsewhere.
const deficiencyController = {
    createDeficiency,
    getAllDeficienciesByUser,
    deleteDeficiencyByCoursepoolAndUserId,
};
exports.default = deficiencyController;
