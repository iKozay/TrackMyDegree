"use strict";
/**
 * Provides course-specific operations using MongoDB.
 * Includes requisite (prerequisites/corequisites) functionality.
 * Decoupled from Express for better reusability.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseController = exports.CourseController = void 0;
const BaseMongoController_1 = require("./BaseMongoController");
const models_1 = require("../../models");
class CourseController extends BaseMongoController_1.BaseMongoController {
    constructor() {
        super(models_1.Course, 'Course');
    }
    // ==========================
    // COURSE OPERATIONS
    // ==========================
    /**
     * Get all courses with optional filtering and pagination
     */
    async getAllCourses(params = {}) {
        try {
            const { pool, search, page, limit, sort } = params;
            const filter = {};
            if (pool) {
                filter.offeredIn = pool;
            }
            const options = {
                page,
                limit,
                sort: sort ? { [sort]: 1 } : { title: 1 },
                search,
                fields: ['title', 'description', '_id'],
            };
            const result = await this.findAll(filter, options);
            return result.data || [];
        }
        catch (error) {
            this.handleError(error, 'getAllCourses');
        }
    }
    /**
     * Get course by code
     */
    async getCourseByCode(code) {
        try {
            const result = await this.findById(code);
            if (!result.success) {
                throw new Error(result.error || 'Course not found');
            }
            return result.data;
        }
        catch (error) {
            this.handleError(error, 'getCourseByCode');
        }
    }
    /**
     * Get courses by pool
     */
    async getCoursesByPool(poolName) {
        try {
            const result = await this.findAll({ offeredIn: poolName });
            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch courses');
            }
            return result.data || [];
        }
        catch (error) {
            this.handleError(error, 'getCoursesByPool');
        }
    }
    // ==========================
    // REQUISITE OPERATIONS
    // ==========================
    /**
     * Create a new course requisite
     */
    async createRequisite(code1, code2, type) {
        try {
            // Validate both courses exist (parallel query)
            const [exists1, exists2] = await Promise.all([
                models_1.Course.exists({ _id: code1 }).exec(),
                models_1.Course.exists({ _id: code2 }).exec(),
            ]);
            if (!exists1 || !exists2) {
                throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
            }
            const field = type === 'pre' ? 'prerequisites' : 'corequisites';
            // Add requisite atomically (won't add if already exists)
            const result = await models_1.Course.updateOne({ _id: code1 }, { $addToSet: { [field]: code2 } }).exec();
            if (result.modifiedCount === 0) {
                throw new Error('Requisite already exists or course not found.');
            }
            return { code1, code2, type };
        }
        catch (error) {
            this.handleError(error, 'createRequisite');
        }
    }
    /**
     * Get all requisites for a course
     */
    async getRequisites(code1) {
        try {
            const course = await models_1.Course.findById(code1)
                .select('prerequisites corequisites')
                .lean()
                .exec();
            if (!course) {
                throw new Error(`Course '${code1}' does not exist.`);
            }
            const requisites = [];
            // Add prerequisites
            (course.prerequisites || []).forEach((code2) => {
                requisites.push({ code1, code2, type: 'pre' });
            });
            // Add corequisites
            (course.corequisites || []).forEach((code2) => {
                requisites.push({ code1, code2, type: 'co' });
            });
            return requisites;
        }
        catch (error) {
            this.handleError(error, 'getRequisites');
        }
    }
    /**
     * Delete a requisite
     * Optimized with atomic operation
     */
    async deleteRequisite(code1, code2, type) {
        try {
            const field = type === 'pre' ? 'prerequisites' : 'corequisites';
            const result = await models_1.Course.updateOne({ _id: code1 }, { $pull: { [field]: code2 } }).exec();
            if (result.modifiedCount === 0) {
                throw new Error('Requisite not found or already deleted.');
            }
            return `Requisite deleted successfully.`;
        }
        catch (error) {
            this.handleError(error, 'deleteRequisite');
        }
    }
}
exports.CourseController = CourseController;
exports.courseController = new CourseController();
//# sourceMappingURL=CourseController.js.map