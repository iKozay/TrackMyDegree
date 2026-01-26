"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const degreeRoutes_1 = __importDefault(require("./degreeRoutes"));
const courseRoutes_1 = __importDefault(require("./courseRoutes"));
const userRoutes_1 = __importDefault(require("./userRoutes"));
const feedbackRoutes_1 = __importDefault(require("./feedbackRoutes"));
const timelineRoutes_1 = __importDefault(require("./timelineRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const router = express_1.default.Router();
router.use('/degree', degreeRoutes_1.default);
router.use('/courses', courseRoutes_1.default);
router.use('/users', userRoutes_1.default);
router.use('/feedback', feedbackRoutes_1.default);
router.use('/timeline', timelineRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map