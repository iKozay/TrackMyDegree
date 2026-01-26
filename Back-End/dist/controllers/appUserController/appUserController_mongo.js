"use strict";
/**
 * Purpose:
 *  - Controller module for the User collection (MongoDB).
 *  - Provides functions to update and delete user records.
 * Notes:
 *  - Uses Mongoose instead of raw SQL.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If the Mongoose connection is not ready, functions just return `undefined`.
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
const mongoose_1 = __importDefault(require("mongoose"));
const Sentry = __importStar(require("@sentry/node"));
const User_1 = require("../../models/User");
/**
 * Updates an existing User in MongoDB.
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
        // Check MongoDB connection state (1 = connected)
        if (mongoose_1.default.connection.readyState !== 1) {
            return undefined;
        }
        try {
            const existingUser = yield User_1.User.findById(id);
            if (!existingUser) {
                throw new Error('AppUser with this id does not exist.');
            }
            existingUser.email = email;
            existingUser.password = password; // Note: plain text, consider hashing later
            existingUser.fullname = fullname;
            existingUser.degree = degree;
            existingUser.type = type;
            yield existingUser.save();
            const userObj = existingUser.toObject();
            return Object.assign(Object.assign({}, userObj), { id: userObj._id });
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Deletes an existing User from MongoDB.
 *
 * @param {string} id - The unique identifier of the user to be deleted.
 * @returns {Promise<string | undefined>} - Success message or undefined if connection unavailable.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
function deleteAppUser(id) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check MongoDB connection
        if (mongoose_1.default.connection.readyState !== 1) {
            return undefined;
        }
        try {
            const deleted = yield User_1.User.findByIdAndDelete(id);
            if (!deleted) {
                throw new Error('AppUser with this id does not exist.');
            }
            return `AppUser with id ${id} has been successfully deleted.`;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
const appUserController = {
    updateAppUser,
    deleteAppUser,
};
exports.default = appUserController;
