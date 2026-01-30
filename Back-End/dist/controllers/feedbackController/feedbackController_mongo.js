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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = submitFeedback;
const Feedback_1 = require("../../models/Feedback");
/**
 * Submits feedback to the database.
 * Feedback can optionally be tied to a specific user.
 *
 * @param {string} message - The feedback message provided by the user.
 * @param {string} [user_id] - The optional user ID associated with the feedback. If not provided, it's set to null.
 * @returns {Promise<{ id: string; message: string; user_id: string; submitted_at: string }>} - An object containing the feedback details: id, message, user_id, and timestamp when it was submitted.
 *
 * @throws {Error} - Throws an error if there's any issue while interacting with the database.
 */
function submitFeedback(message, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: Validate user_id if provided
        const feedback = yield Feedback_1.Feedback.create({
            message,
            user_id,
        });
        return {
            id: feedback.id,
            message: feedback.message,
            user_id: feedback.user_id,
            submitted_at: feedback.submitted_at,
        };
    });
}
