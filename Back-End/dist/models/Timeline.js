"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timeline = void 0;
const mongoose_1 = require("mongoose");
const TimelineItemSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    season: { type: String, enum: ['fall', 'winter', 'summer1', 'summer2', 'fall/winter', 'summer', 'exempted', 'deficiencies'], required: true },
    year: { type: Number, required: true },
    courses: [{ type: String, ref: 'Course' }] // references to Course _id
});
const TimelineSchema = new mongoose_1.Schema({
    _id: { type: String },
    userId: { type: String, ref: 'User', required: true },
    degreeId: { type: String, ref: 'Degree' },
    name: { type: String, required: true },
    isExtendedCredit: { type: Boolean, default: false },
    last_modified: { type: Date, default: Date.now },
    items: [TimelineItemSchema]
});
exports.Timeline = (0, mongoose_1.model)('Timeline', TimelineSchema);
