"use strict";
/**
 * Generic Base MongoDB Controller
 *
 * Provides optimized CRUD operations and utilities for all MongoDB controllers.
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
exports.BaseMongoController = void 0;
const Sentry = __importStar(require("@sentry/node"));
const QUERY_FAILED = 'Query failed';
const DELETE_FAILED = 'Delete failed';
/**
 * Generic base controller class for MongoDB operations
 */
class BaseMongoController {
    constructor(model, modelName) {
        this.model = model;
        this.modelName = modelName;
    }
    /**
     * Generic error handler with Sentry integration
     */
    handleError(error, operation) {
        Sentry.captureException(error, {
            tags: {
                model: this.modelName,
                operation,
            },
        });
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[${this.modelName}] Error in ${operation}:`, errorMessage);
        throw error;
    }
    /**
     * Create a new document
     */
    async create(data) {
        try {
            const document = await this.model.create(data);
            return {
                success: true,
                data: document.toObject(),
                message: `${this.modelName} created successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Creation failed',
            };
        }
    }
    /**
     * Find document by ID with optional field selection
     */
    async findById(id, select) {
        try {
            let query = this.model.findById(id);
            if (select) {
                query = query.select(select);
            }
            const document = await query.lean().exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return { success: true, data: document };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : QUERY_FAILED,
            };
        }
    }
    /**
     * Find document by custom filter
     */
    async findOne(filter, select) {
        try {
            let query = this.model.findOne(filter);
            if (select) {
                query = query.select(select);
            }
            const document = await query.lean().exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return { success: true, data: document };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : QUERY_FAILED,
            };
        }
    }
    /**
     * Find all documents with optional filtering, search, and pagination
     * Optimized with lean() and proper indexing
     */
    async findAll(filter = {}, options = {}) {
        try {
            let query = this.model.find(filter);
            // Apply search if provided
            if (options.search && options.fields && options.fields.length > 0) {
                const searchRegex = new RegExp(options.search, 'i');
                const searchConditions = options.fields.map((field) => ({
                    [field]: searchRegex,
                }));
                query = query.or(searchConditions);
            }
            // Apply field selection
            if (options.select) {
                query = query.select(options.select);
            }
            // Apply sorting
            if (options.sort) {
                query = query.sort(options.sort);
            }
            // Apply pagination
            if (options.page && options.limit) {
                const skip = (options.page - 1) * options.limit;
                query = query.skip(skip).limit(options.limit);
            }
            const documents = await query.lean().exec();
            return { success: true, data: documents };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : QUERY_FAILED,
            };
        }
    }
    /**
     * Update document by ID
     */
    async updateById(id, update) {
        try {
            const document = await this.model
                .findByIdAndUpdate(id, update, {
                new: true,
                runValidators: true,
            })
                .lean()
                .exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return {
                success: true,
                data: document,
                message: `${this.modelName} updated successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Update failed',
            };
        }
    }
    /**
     * Update document by custom filter
     */
    async updateOne(filter, update) {
        try {
            const document = await this.model
                .findOneAndUpdate(filter, update, {
                new: true,
                runValidators: true,
                upsert: false,
            })
                .lean()
                .exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return {
                success: true,
                data: document,
                message: `${this.modelName} updated successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Update failed',
            };
        }
    }
    /**
     * Update or create document (upsert)
     */
    async upsert(filter, update) {
        try {
            const document = await this.model
                .findOneAndUpdate(filter, update, {
                new: true,
                upsert: true,
                runValidators: true,
            })
                .lean()
                .exec();
            return {
                success: true,
                data: document,
                message: `${this.modelName} saved successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upsert failed',
            };
        }
    }
    /**
     * Delete document by ID
     */
    async deleteById(id) {
        try {
            const document = await this.model.findByIdAndDelete(id).exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return {
                success: true,
                message: `${this.modelName} deleted successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : DELETE_FAILED,
            };
        }
    }
    /**
     * Delete document by custom filter
     */
    async deleteOne(filter) {
        try {
            const document = await this.model.findOneAndDelete(filter).exec();
            if (!document) {
                return { success: false, error: `${this.modelName} not found` };
            }
            return {
                success: true,
                message: `${this.modelName} deleted successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : DELETE_FAILED,
            };
        }
    }
    /**
     * Delete multiple documents
     */
    async deleteMany(filter) {
        try {
            const result = await this.model.deleteMany(filter).exec();
            return {
                success: true,
                data: result.deletedCount,
                message: `${result.deletedCount} ${this.modelName}(s) deleted successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : DELETE_FAILED,
            };
        }
    }
    /**
     * Count documents with optional filter
     * Uses countDocuments (not deprecated count method)
     */
    async count(filter = {}) {
        try {
            const count = await this.model.countDocuments(filter).exec();
            return { success: true, data: count };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Count failed',
            };
        }
    }
    /**
     * Check if document exists (optimized - only checks _id field)
     */
    async exists(filter) {
        try {
            const exists = await this.model.exists(filter).exec();
            return { success: true, data: !!exists };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Exists check failed',
            };
        }
    }
    /**
     * Bulk create documents
     */
    async bulkCreate(documents) {
        try {
            const created = await this.model.insertMany(documents, {
                ordered: false,
                rawResult: false,
            });
            return {
                success: true,
                data: created.map((doc) => doc.toObject()),
                message: `${created.length} ${this.modelName}(s) created successfully`,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bulk create failed',
            };
        }
    }
    /**
     * Aggregate query helper
     */
    async aggregate(pipeline) {
        try {
            // Type assertion needed for flexibility with aggregation pipelines
            const results = await this.model.aggregate(pipeline).exec();
            return { success: true, data: results };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Aggregation failed',
            };
        }
    }
}
exports.BaseMongoController = BaseMongoController;
//# sourceMappingURL=BaseMongoController.js.map