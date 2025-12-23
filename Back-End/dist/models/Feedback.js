"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feedback = void 0;
const mongoose_1 = require("mongoose");
const FeedbackSchema = new mongoose_1.Schema({
    user_id: { type: String, ref: 'User', default: null }, // Allows anonymous feedback
    message: { type: String, required: true },
}, { timestamps: { createdAt: 'submitted_at' } }); // Automatically adds submitted_at
exports.Feedback = (0, mongoose_1.model)('Feedback', FeedbackSchema);
