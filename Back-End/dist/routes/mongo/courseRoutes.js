"use strict";
/**
 * Course Routes
 *
 * Handles course operations (read-only)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HTTPCodes_1 = __importDefault(require("../../Util/HTTPCodes"));
const express_1 = __importDefault(require("express"));
const mondoDBControllers_1 = require("../../controllers/mondoDBControllers");
const router = express_1.default.Router();
// ==========================
// COURSE ROUTES (READ ONLY)
// ==========================
/**
 * GET /courses - Get all courses
 */
router.get('/', async (req, res) => {
    try {
        const { pool, search, page, limit, sort } = req.query;
        const courses = await mondoDBControllers_1.courseController.getAllCourses({
            pool: pool,
            search: search,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            sort: sort,
        });
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Courses retrieved successfully',
            courses,
        });
    }
    catch (error) {
        console.error('Error in GET /courses', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Internal server error' });
    }
});
/**
 * GET /courses/:code - Get course by code
 */
router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: 'Course code is required',
            });
            return;
        }
        const course = await mondoDBControllers_1.courseController.getCourseByCode(code);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Course retrieved successfully',
            course,
        });
    }
    catch (error) {
        console.error('Error in GET /courses/:code', error);
        if (error instanceof Error && error.message.includes('not found')) {
            res.status(HTTPCodes_1.default.NOT_FOUND).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: 'Internal server error' });
        }
    }
});
exports.default = router;
//# sourceMappingURL=courseRoutes.js.map