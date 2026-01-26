"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const DeficiencySchema = new mongoose_1.Schema({
    // _id is automatically created by MongoDB
    coursepool: { type: String, required: true },
    creditsRequired: { type: Number, required: true },
});
const UserSchema = new mongoose_1.Schema({
    // _id is automatically created by MongoDB
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    fullname: { type: String, required: true },
    degree: { type: String, ref: 'Degree' },
    type: { type: String, enum: ['student', 'advisor', 'admin'], required: true },
    resetTokenExpire: { type: Date, default: null },
    deficiencies: [DeficiencySchema],
    exemptions: [{ type: String, ref: 'Course' }],
});
exports.User = (0, mongoose_1.model)('User', UserSchema);
//# sourceMappingURL=User.js.map