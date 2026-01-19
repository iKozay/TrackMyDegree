"use strict";
/**
 * Purpose:
 *  - Controller module for course requisites using Mongoose.
 *  - Provides functions to create, read, update, and delete course requisites.
 * Notes:
 *  - Uses Course model with prerequisites and corequisites arrays.
 *  - Errors are logged to Sentry and then rethrown.
 *  - Maintains same method signatures as SQL version.
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
Object.defineProperty(exports, "__esModule", { value: true });
const models_1 = require("../../models");
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
/**
 * Creates a new course requisite if it does not already exist.
 */
function createRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if both courses exist
            const [course1, course2] = yield Promise.all([
                models_1.Course.findById(code1),
                models_1.Course.findById(code2)
            ]);
            if (!course1 || !course2) {
                throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
            }
            // Check if requisite already exists
            const field = type === 'pre' ? 'prerequisites' : 'corequisites';
            if (course1[field].includes(code2)) {
                throw new Error('Requisite with this combination of courses already exists.');
            }
            // Add requisite
            yield models_1.Course.findByIdAndUpdate(code1, {
                $addToSet: { [field]: code2 }
            });
            return {
                id: (0, crypto_1.randomUUID)(),
                code1,
                code2,
                type
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Reads requisites for a given course.
 */
function readRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Validate course exists
            const course = yield models_1.Course.findById(code1);
            if (!course) {
                throw new Error(`Course '${code1}' does not exist.`);
            }
            const requisites = [];
            // If specific code2 and type provided
            if (code2 && type) {
                const field = type === 'pre' ? 'prerequisites' : 'corequisites';
                if (course[field].includes(code2)) {
                    requisites.push({
                        id: (0, crypto_1.randomUUID)(),
                        code1,
                        code2,
                        type
                    });
                }
                return requisites;
            }
            // Return all requisites for code1
            course.prerequisites.forEach((prereq) => {
                requisites.push({
                    id: (0, crypto_1.randomUUID)(),
                    code1,
                    code2: prereq,
                    type: 'pre'
                });
            });
            course.corequisites.forEach((coreq) => {
                requisites.push({
                    id: (0, crypto_1.randomUUID)(),
                    code1,
                    code2: coreq,
                    type: 'co'
                });
            });
            return requisites;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Updates an existing requisite.
 */
function updateRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if both courses exist
            const [course1, course2] = yield Promise.all([
                models_1.Course.findById(code1),
                models_1.Course.findById(code2)
            ]);
            if (!course1 || !course2) {
                throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
            }
            const field = type === 'pre' ? 'prerequisites' : 'corequisites';
            // Check if requisite already exists
            if (course1[field].includes(code2)) {
                throw new Error('Requisite with this combination of courses already exists.');
            }
            // Add the requisite
            yield models_1.Course.findByIdAndUpdate(code1, {
                $addToSet: { [field]: code2 }
            });
            return {
                id: (0, crypto_1.randomUUID)(),
                code1,
                code2,
                type
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Deletes a requisite.
 */
function deleteRequisite(code1, code2, type) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const course = yield models_1.Course.findById(code1);
            if (!course) {
                throw new Error('Course does not exist.');
            }
            const field = type === 'pre' ? 'prerequisites' : 'corequisites';
            if (!course[field].includes(code2)) {
                throw new Error('Requisite with this id does not exist.');
            }
            // Remove requisite
            yield models_1.Course.findByIdAndUpdate(code1, {
                $pull: { [field]: code2 }
            });
            return `Requisite with the course combination provided has been successfully deleted.`;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
const requisiteController = {
    createRequisite,
    readRequisite,
    updateRequisite,
    deleteRequisite,
};
exports.default = requisiteController;
