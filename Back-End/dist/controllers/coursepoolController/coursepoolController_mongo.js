"use strict";
/**
 * Purpose:
 *  - Controller for managing CoursePool entities in MongoDB (create, read, update, delete).
 *  - Encapsulates all DB operations tied to course pools.
 *
 * Notes:
 *  - Returns DB_OPS enum to standardize operation results (SUCCESS, FAILURE, etc.)
 *  - CoursePools are embedded within Degree documents.
 *  - Errors logged locally and reported to Sentry.
 *  - Uses coursepool_types.d.ts for strong typing of course pool objects.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Degree_1 = require("../../models/Degree");
const DB_Ops_1 = __importDefault(require("../../Util/DB_Ops"));
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
const log = console.log;
/**
 * Creates a new course pool.
 * NOTE: In MongoDB implementation, course pools are embedded in Degree documents.
 * This function only generates and logs a new pool ID. To actually use the pool,
 * it must be added to a Degree document via DegreeXCPController.
 *
 * @param {string} pool_name - The name of the course pool.
 * @returns {Promise<DB_OPS>} - Returns a DB operation status.
 */
function createCoursePool(pool_name) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const record = {
                id: (0, crypto_1.randomUUID)(),
                name: pool_name,
            };
            // Placeholder: actual persistence logic may depend on Degree model usage
            log(`CoursePool '${pool_name}' with id '${record.id}' created successfully`);
            return DB_Ops_1.default.SUCCESS;
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in coursepool creation\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
/**
 * Retrieves all course pools from all degrees.
 * Aggregates coursePools from all Degree documents and removes duplicates.
 *
 * @returns {Promise<{ course_pools: CoursePoolTypes.CoursePoolItem[] } | undefined>}
 */
function getAllCoursePools() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degrees = yield Degree_1.Degree.find().lean();
            const allPoolsMap = new Map();
            for (const degree of degrees) {
                if (!degree.coursePools)
                    continue;
                for (const pool of degree.coursePools) {
                    if (!allPoolsMap.has(pool.id)) {
                        allPoolsMap.set(pool.id, { id: pool.id, name: pool.name });
                    }
                }
            }
            const course_pools = Array.from(allPoolsMap.values());
            return { course_pools };
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error fetching all course pools\n', error);
            return undefined;
        }
    });
}
/**
 * Retrieves a specific course pool by ID.
 *
 * @param {string} pool_id - The course pool ID.
 * @returns {Promise<CoursePoolTypes.CoursePoolItem | undefined>}
 */
function getCoursePool(pool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const degrees = yield Degree_1.Degree.find({ 'coursePools.id': pool_id }).lean();
            if (degrees.length === 0) {
                log(`CoursePool with id '${pool_id}' not found`);
                return undefined;
            }
            for (const degree of degrees) {
                const pool = (_a = degree.coursePools) === null || _a === void 0 ? void 0 : _a.find(cp => cp.id === pool_id);
                if (pool) {
                    return { id: pool.id, name: pool.name };
                }
            }
            return undefined;
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error fetching course pool by ID\n', error);
            return undefined;
        }
    });
}
/**
 * Updates an existing course pool across all degrees that contain it.
 *
 * @param {CoursePoolTypes.CoursePoolItem} update_info - The course pool details to update.
 * @returns {Promise<DB_OPS>}
 */
function updateCoursePool(update_info) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id, name } = update_info;
        try {
            const degrees = yield Degree_1.Degree.find({ 'coursePools.id': id });
            if (degrees.length === 0) {
                log(`CoursePool with id '${id}' not found in any degree`);
                return DB_Ops_1.default.MOSTLY_OK;
            }
            let updated = false;
            yield Promise.all(degrees.map((degree) => __awaiter(this, void 0, void 0, function* () {
                const pool = degree.coursePools.find(cp => cp.id === id);
                if (pool) {
                    pool.name = name;
                    yield degree.save();
                    updated = true;
                }
            })));
            return updated ? DB_Ops_1.default.SUCCESS : DB_Ops_1.default.MOSTLY_OK;
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in updating course pool item\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
/**
 * Removes a course pool by ID from all degrees.
 *
 * @param {string} pool_id - The course pool ID to remove.
 * @returns {Promise<DB_OPS>}
 */
function removeCoursePool(pool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degrees = yield Degree_1.Degree.find({ 'coursePools.id': pool_id });
            if (degrees.length === 0) {
                log(`CoursePool with id '${pool_id}' not found in any degree`);
                return DB_Ops_1.default.MOSTLY_OK;
            }
            let removed = false;
            yield Promise.all(degrees.map((degree) => __awaiter(this, void 0, void 0, function* () {
                const initialLength = degree.coursePools.length;
                // Find the index and remove using splice
                const index = degree.coursePools.findIndex(cp => cp.id === pool_id);
                if (index !== -1) {
                    degree.coursePools.splice(index, 1);
                    yield degree.save();
                    removed = true;
                }
            })));
            return removed ? DB_Ops_1.default.SUCCESS : DB_Ops_1.default.MOSTLY_OK;
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in deleting course pool item\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
const coursepoolController = {
    createCoursePool,
    getAllCoursePools,
    getCoursePool,
    updateCoursePool,
    removeCoursePool,
};
exports.default = coursepoolController;
