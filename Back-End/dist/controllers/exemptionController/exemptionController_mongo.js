"use strict";
/**
 * Purpose:
 *  - Controller module for user-embedded exemptions (MongoDB).
 *  - Provides functions to create, read, and delete exemptions stored inside the User model.
 * Notes:
 *  - No separate Exemption collection; data lives within the User document.
 *  - Uses Mongoose and Sentry for error handling.
 *  - Returns results shaped like the SQL version for backward compatibility.
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
const Course_1 = require("../../models/Course");
/**
 * Creates exemptions for a list of courses for a specific user.
 * Returns { created, alreadyExists } arrays.
 */
function createExemptions(coursecodes, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        // Connection check
        if (mongoose_1.default.connection.readyState !== 1) {
            return { created: [], alreadyExists: [] };
        }
        const created = [];
        const alreadyExists = [];
        try {
            const user = yield User_1.User.findById(user_id);
            if (!user)
                throw new Error(`AppUser with id '${user_id}' does not exist.`);
            for (const code of coursecodes) {
                const course = yield Course_1.Course.findById(code);
                if (!course)
                    throw new Error(`Course with code '${code}' does not exist.`);
                if (user.exemptions.includes(code)) {
                    alreadyExists.push(code);
                    continue;
                }
                user.exemptions.push(code);
                created.push({ coursecode: code, user_id });
            }
            yield user.save();
            return { created, alreadyExists };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Retrieves all exemptions associated with a specific user.
 */
function getAllExemptionsByUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (mongoose_1.default.connection.readyState !== 1) {
            return undefined;
        }
        try {
            const user = yield User_1.User.findById(user_id);
            if (!user)
                throw new Error(`AppUser with id '${user_id}' does not exist.`);
            if (!user.exemptions || user.exemptions.length === 0) {
                throw new Error(`No exemptions found for user with id '${user_id}'.`);
            }
            return user.exemptions.map((code) => ({
                coursecode: code,
                user_id,
            }));
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Deletes an exemption for a specific course and user.
 */
function deleteExemptionByCoursecodeAndUserId(coursecode, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        if (mongoose_1.default.connection.readyState !== 1) {
            return undefined;
        }
        try {
            const user = yield User_1.User.findById(user_id);
            if (!user)
                throw new Error(`AppUser with id '${user_id}' does not exist.`);
            if (!user.exemptions.includes(coursecode)) {
                throw new Error('Exemption with this coursecode and user_id does not exist.');
            }
            user.exemptions = user.exemptions.filter((c) => c !== coursecode);
            yield user.save();
            return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
const exemptionController = {
    createExemptions,
    getAllExemptionsByUser,
    deleteExemptionByCoursecodeAndUserId,
};
exports.default = exemptionController;
