"use strict";
/**
 * Purpose:
 *  - Controller module for the Feedback table.
 *  - Provides a function to submit feedback from users.
 * Notes:
 *  - Stores optional user_id if provided.
 *  - Errors are logged to Sentry and then rethrown.
 *  - Generates unique ID and timestamp for each feedback.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = submitFeedback;
const DBController_1 = __importDefault(require("../DBController/DBController"));
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
/**
 * Submits feedback to the database.
 * Feedback can optionally be tied to a specific user.
 *
 * @param {string} message - The feedback message provided by the user.
 * @param {string} [user_id] - The optional user ID associated with the feedback. If not provided, it's set to null.
 * @returns {Promise<{ id: string; message: string; user_id: string | null; submitted_at: string }>} - An object containing the feedback details: id, message, user_id, and timestamp when it was submitted.
 *
 * @throws {Error} - Throws an error if there's any issue while interacting with the database.
 */
async function submitFeedback(message, user_id) {
    const conn = await DBController_1.default.getConnection();
    if (conn) {
        try {
            // Step 1: Generate a unique ID for this feedback entry.
            const id = (0, crypto_1.randomUUID)();
            // Step 2: Record the exact submission timestamp in ISO format.
            const submitted_at = new Date().toISOString();
            // Step 3: Insert the feedback into the database.
            // If user_id is not provided, we store it as NULL.
            await conn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('message', DBController_1.default.msSQL.VarChar, message)
                .input('user_id', DBController_1.default.msSQL.VarChar, user_id || null)
                .input('submitted_at', DBController_1.default.msSQL.DateTime2, submitted_at)
                .query('INSERT INTO Feedback (id, message, user_id, submitted_at) VALUES (@id, @message, @user_id, @submitted_at)');
            // Step 4: Return the full feedback object so the caller knows what was stored.
            return { id, message, user_id, submitted_at };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
        finally {
            conn.close();
        }
    }
}
//# sourceMappingURL=feedbackController.js.map