"use strict";
// controllers/deficiencyController/deficiencyController_mongo.ts
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
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
// Use existing models
const User_1 = require("../../models/User");
const Degree_1 = require("../../models/Degree");
/**
 * Creates a new deficiency for a user and coursepool.
 * - Deficiencies are stored embedded inside the User document (user.deficiencies).
 */
function createDeficiency(coursepool, user_id, creditsRequired) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1) Verify user exists
            const user = yield User_1.User.findOne({ _id: user_id });
            if (!user) {
                throw new Error('AppUser does not exist.');
            }
            // 2) Check if the deficiency already exists on the user (embedded)
            if (Array.isArray(user.deficiencies) && user.deficiencies.some(d => d.coursepool === coursepool)) {
                throw new Error('Deficiency with this coursepool and user_id already exists. Please use the update endpoint');
            }
            // 3) Verify course pool exists somewhere in degrees (assumes Degree.coursePools[] with id field)
            const degreeContainingPool = yield Degree_1.Degree.findOne({ 'coursePools.id': coursepool }).lean();
            if (!degreeContainingPool) {
                throw new Error('CoursePool does not exist.');
            }
            user.deficiencies = user.deficiencies || [];
            user.deficiencies.push({
                coursepool,
                creditsRequired
            });
            // 5) Save the updated user document
            yield user.save();
            // Return the created deficiency (plain object)
            return {
                id: (0, crypto_1.randomUUID)(),
                coursepool,
                user_id,
                creditsRequired
            };
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Retrieves all deficiencies for a specific user.
 * Returns `undefined` if none found (keeps previous behaviour).
 */
function getAllDeficienciesByUser(user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Confirm the user exists and fetch deficiencies
            const user = yield User_1.User.findOne({ _id: user_id }).lean();
            if (!user) {
                throw new Error('AppUser does not exist.');
            }
            const allDeficiencies = (user.deficiencies || []).map(def => ({
                id: (0, crypto_1.randomUUID)(),
                coursepool: def.coursepool,
                user_id: user_id,
                creditsRequired: def.creditsRequired
            }));
            return allDeficiencies;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * Deletes a deficiency based on course pool and user ID.
 */
function deleteDeficiencyByCoursepoolAndUserId(coursepool, user_id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Find the user document (we will mutate it and save)
            const user = yield User_1.User.findOne({ _id: user_id });
            if (!user) {
                throw new Error('AppUser does not exist.');
            }
            if (!Array.isArray(user.deficiencies)) {
                throw new Error('Deficiency with this id does not exist.');
            }
            const idx = user.deficiencies.findIndex(d => d.coursepool === coursepool);
            if (idx === -1) {
                throw new Error('Deficiency with this id does not exist.');
            }
            // Remove the deficiency and save
            user.deficiencies.splice(idx, 1);
            yield user.save();
            return `Deficiency with appUser ${user_id} and coursepool ${coursepool} has been successfully deleted.`;
        }
        catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    });
}
const deficiencyControllerMongo = {
    createDeficiency,
    getAllDeficienciesByUser,
    deleteDeficiencyByCoursepoolAndUserId,
};
exports.default = deficiencyControllerMongo;
