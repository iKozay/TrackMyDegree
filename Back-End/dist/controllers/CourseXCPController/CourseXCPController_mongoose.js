"use strict";
/**
 * Purpose:
 *  - Mongoose version of CourseXCPController for managing course-coursepool mappings.
 *  - Provides functions to create, read, update and delete CourseXCoursePool records.
 * Notes:
 *  - Uses Mongoose models instead of SQL database
 *  - Maintains same method signatures as SQL version
 *  - Returns DB_OPS enum for consistency
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
const Sentry = __importStar(require("@sentry/node"));
const log = console.log;
/**
 * Insert a new course in CoursePool record.
 */
function createCourseXCP(new_record) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { coursecode, coursepool_id } = new_record;
            const degree = yield Degree_1.Degree.findOne({ 'coursePools.id': coursepool_id });
            if (!degree) {
                log('CoursePool not found: ' + coursepool_id);
                Sentry.captureMessage('CoursePool not found: ' + coursepool_id);
                return DB_Ops_1.default.MOSTLY_OK;
            }
            const coursePool = degree.coursePools.find(pool => pool.id === coursepool_id);
            if (coursePool && !coursePool.courses.includes(coursecode)) {
                coursePool.courses.push(coursecode);
                yield degree.save();
                return DB_Ops_1.default.SUCCESS;
            }
            else {
                return DB_Ops_1.default.MOSTLY_OK;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in courseXcoursepool creation\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
/**
 * Fetch all course codes for a given course pool id
 */
function getAllCourseXCP(coursepool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const degree = yield Degree_1.Degree.findOne({ 'coursePools.id': coursepool_id });
            if (!degree) {
                return { course_codes: [] };
            }
            const coursePool = degree.coursePools.find(pool => pool.id === coursepool_id);
            const codes = [];
            if (coursePool && coursePool.courses) {
                for (let i = 0; i < coursePool.courses.length; i++) {
                    codes.push(coursePool.courses[i]);
                }
            }
            return {
                course_codes: codes,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error fetching all course codes for given coursepool id\n', error);
            return undefined;
        }
    });
}
/**
 * Update existing CourseXCoursePool row.
 */
function updateCourseXCP(update_record) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { coursecode, coursepool_id } = update_record;
            const degree = yield Degree_1.Degree.findOne({ 'coursePools.id': coursepool_id });
            console.log(degree);
            if (!degree) {
                return DB_Ops_1.default.MOSTLY_OK;
            }
            const coursePool = degree.coursePools.find(pool => pool.id === coursepool_id);
            if (coursePool && !(coursePool === null || coursePool === void 0 ? void 0 : coursePool.courses.includes(coursecode))) {
                coursePool.courses.push(coursecode);
                yield degree.save();
                return DB_Ops_1.default.SUCCESS;
            }
            else {
                return DB_Ops_1.default.MOSTLY_OK;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in updating courseXcoursepool item\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
/**
 * Delete a CourseXCoursePool mapping
 */
function removeDegreeXCP(delete_record) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { coursecode, coursepool_id } = delete_record;
            const degree = yield Degree_1.Degree.findOne({ 'coursePools.id': coursepool_id });
            if (!degree) {
                return DB_Ops_1.default.MOSTLY_OK;
            }
            const coursePool = degree.coursePools.find(pool => pool.id === coursepool_id);
            const courseIndex = coursePool === null || coursePool === void 0 ? void 0 : coursePool.courses.indexOf(coursecode);
            console.log(courseIndex);
            if (coursePool && courseIndex && courseIndex > -1) {
                coursePool.courses.splice(courseIndex, 1);
                yield degree.save();
                return DB_Ops_1.default.SUCCESS;
            }
            else {
                return DB_Ops_1.default.MOSTLY_OK;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in deleting courseXcoursepool item\n', error);
            return DB_Ops_1.default.FAILURE;
        }
    });
}
const CourseXCPController = {
    createCourseXCP,
    getAllCourseXCP,
    updateCourseXCP,
    removeDegreeXCP,
};
exports.default = CourseXCPController;
