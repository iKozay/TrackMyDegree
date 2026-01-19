"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Course = void 0;
const mongoose_1 = require("mongoose");
const CourseSchema = new mongoose_1.Schema({
    _id: { type: String }, // course code ex: 'SOEN490'
    title: { type: String, required: true },
    credits: { type: Number, required: true },
    description: { type: String, required: true },
    offeredIn: [{ type: String }], // e.g., ['fall', 'winter']
    corequisites: [{ type: String, ref: 'Course' }], // references to Course _id
    prerequisites: [{ type: String, ref: 'Course' }], // references to Course _id
});
exports.Course = (0, mongoose_1.model)('Course', CourseSchema);
//# sourceMappingURL=Course.js.map