"use strict";
/**
 * Provides degree-specific operations with improved error handling and query optimization.
 * Includes course pool and degree-course pool mapping functionality.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.degreeController = exports.DegreeController = void 0;
const BaseMongoController_1 = require("./BaseMongoController");
const models_1 = require("../../models");
const Sentry = __importStar(require("@sentry/node"));
class DegreeController extends BaseMongoController_1.BaseMongoController {
    constructor() {
        super(models_1.Degree, 'Degree');
    }
    // ==========================
    // DEGREE OPERATIONS
    // ==========================
    /**
     * Get degree by ID
     */
    async readDegree(_id) {
        try {
            const result = await this.findById(_id, 'name totalCredits');
            if (!result.success) {
                throw new Error('Degree with this id does not exist.');
            }
            return {
                _id: result.data._id,
                name: result.data.name,
                totalCredits: result.data.totalCredits,
            };
        }
        catch (error) {
            this.handleError(error, 'readDegree');
        }
    }
    /**
     * Get all degrees (excluding ECP)
     */
    async readAllDegrees() {
        try {
            const result = await this.findAll({ _id: { $ne: 'ECP' } }, { select: 'name totalCredits', sort: { name: 1 } });
            if (!result.success) {
                throw new Error('Failed to fetch degrees');
            }
            return (result.data || []).map((degree) => ({
                _id: degree._id,
                name: degree.name,
                totalCredits: degree.totalCredits,
            }));
        }
        catch (error) {
            this.handleError(error, 'readAllDegrees');
        }
    }
    /**
     * Get credits for degree (optimized - only fetches totalCredits field)
     */
    async getCreditsForDegree(_id) {
        try {
            const result = await this.findById(_id, 'totalCredits');
            if (!result.success) {
                throw new Error('Degree with this id does not exist.');
            }
            return result.data.totalCredits;
        }
        catch (error) {
            this.handleError(error, 'getCreditsForDegree');
        }
    }
    // ==========================
    // COURSE POOL OPERATIONS
    // ==========================
    /**
     * Get all course pools from all degrees (aggregated and deduplicated)
     */
    async getAllCoursePools() {
        try {
            const result = await this.aggregate([
                { $unwind: '$coursePools' },
                {
                    $group: {
                        _id: '$coursePools._id',
                        name: { $first: '$coursePools.name' },
                        creditsRequired: { $first: '$coursePools.creditsRequired' },
                    },
                },
                {
                    $project: {
                        _id: '$_id',
                        name: 1,
                        creditsRequired: 1,
                    },
                },
                { $sort: { name: 1 } },
            ]);
            return result.data || [];
        }
        catch (error) {
            Sentry.captureException(error);
            console.error('[DegreeController] Error fetching all course pools:', error);
            return [];
        }
    }
    /**
     * Get a specific course pool by ID
     */
    async getCoursePool(pool_id) {
        try {
            const result = await this.aggregate([
                { $unwind: '$coursePools' },
                { $match: { 'coursePools._id': pool_id } },
                {
                    $project: {
                        _id: '$coursePools._id',
                        name: '$coursePools.name',
                        creditsRequired: '$coursePools.creditsRequired',
                        courses: '$coursePools.courses',
                    },
                },
                { $limit: 1 },
            ]);
            return result.data?.[0];
        }
        catch (error) {
            Sentry.captureException(error);
            console.error('[DegreeController] Error fetching course pool:', error);
            return undefined;
        }
    }
    /**
     * Get all course pools for a specific degree
     */
    async getCoursePoolsByDegree(degree_id) {
        try {
            const degree = await models_1.Degree.findById(degree_id)
                .select('coursePools')
                .lean()
                .exec();
            if (!degree || !degree.coursePools) {
                return [];
            }
            return degree.coursePools.map((cp) => ({
                _id: cp._id,
                name: cp.name,
                creditsRequired: cp.creditsRequired,
                courses: cp.courses,
            }));
        }
        catch (error) {
            Sentry.captureException(error);
            console.error('[DegreeController] Error fetching degree course pools:', error);
            return [];
        }
    }
}
exports.DegreeController = DegreeController;
exports.degreeController = new DegreeController();
//# sourceMappingURL=DegreeController.js.map