"use strict";
/**
 * Purpose:
 *  - Controller module for the AppUser table.
 *  - Provides functions to update and delete user records.
 * Notes:
 *  - Relies on type definitions from appUser_types.d.ts for AppUser shape and roles
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions just return `undefined` silently.
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
const Sentry = __importStar(require("@sentry/node"));
/**
 * Updates an existing AppUser in the database.
 *
 * @param {string} id - The unique identifier of the user.
 * @param {string} email - The new email of the user.
 * @param {string} password - The new password of the user.
 * @param {string} fullname - The updated full name of the user.
 * @param {string} degree - The updated degree ID associated with the user.
 * @param {appUserTypes.UserType} type - The updated user type (student, advisor, admin).
 * @returns {Promise<appUserTypes.AppUser | undefined>} - The updated user record or undefined if the update fails.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
function updateAppUser(id, email, password, fullname, degree, type) {
    return __awaiter(this, void 0, void 0, function* () {
        // Establish a database connection
        const conn = yield DBController_1.default.getConnection();
        // consider throwing or returning a specific error value here?
        if (conn) {
            try {
                // Check if an AppUser with the given id exists
                const appUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (appUser.recordset.length === 0) {
                    throw new Error('AppUser with this id does not exist.');
                }
                // Update the AppUser with the provided values
                yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('email', DBController_1.default.msSQL.VarChar, email)
                    .input('password', DBController_1.default.msSQL.VarChar, password)
                    .input('fullname', DBController_1.default.msSQL.VarChar, fullname)
                    .input('degree', DBController_1.default.msSQL.VarChar, degree)
                    .input('type', DBController_1.default.msSQL.VarChar, type)
                    .query(`UPDATE AppUser 
            SET email = @email, 
                password = @password, 
                fullname = @fullname, 
                degree = @degree, 
                type = @type 
            WHERE id = @id`);
                // Stores passwords directly on plaintext which could be a security risk here, suggest hashing
                // Retrieve and return the updated user data
                const updatedAppUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                return updatedAppUser.recordset[0];
            }
            catch (error) {
                Sentry.captureException(error);
                throw error; // Rethrow any errors encountered
            }
            finally {
                // I'd suggest consider awaiting it through
                // `await conn.close();`
                // ensures the connection is fully closed before this function resolves
                conn.close(); // Ensure the database connection is closed
            }
        }
    });
}
/**
 * Deletes an AppUser from the database.
 *
 * @param {string} id - The unique identifier of the user to be deleted.
 * @returns {Promise<string | undefined>} - A success message if deletion is successful, or undefined if an error occurs.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
function deleteAppUser(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const conn = yield DBController_1.default.getConnection();
        // Again, consider throwing or returning a specific error value here
        if (conn) {
            try {
                // Check if an AppUser with the given id exists
                const appUser = yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('SELECT * FROM AppUser WHERE id = @id');
                if (appUser.recordset.length === 0) {
                    throw new Error('AppUser with this id does not exist.');
                }
                // Delete the AppUser from the database
                yield conn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .query('DELETE FROM AppUser WHERE id = @id');
                // Return success message
                return `AppUser with id ${id} has been successfully deleted.`;
            }
            catch (error) {
                Sentry.captureException(error);
                throw error; // Rethrow any errors encountered
            }
            finally {
                // again consider `await conn.close();` to be sure connection has ended
                conn.close(); // Ensure the database connection is always closed
            }
        }
    });
}
//Namespace
const appUserController = {
    updateAppUser,
    deleteAppUser,
};
exports.default = appUserController;
