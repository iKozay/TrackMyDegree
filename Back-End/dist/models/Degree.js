"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Degree = void 0;
const mongoose_1 = require("mongoose");
const CoursePoolSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    creditsRequired: { type: Number, required: true },
    courses: [{ type: String, ref: 'Course' }]
});
const DegreeSchema = new mongoose_1.Schema({
    _id: { type: String },
    name: { type: String, required: true, unique: true },
    totalCredits: { type: Number, required: true },
    isAddon: { type: Boolean, default: false },
    coursePools: [CoursePoolSchema]
});
exports.Degree = (0, mongoose_1.model)('Degree', DegreeSchema);
