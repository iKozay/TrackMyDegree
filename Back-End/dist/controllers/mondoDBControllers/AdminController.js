"use strict";
/**
 * Handles admin operations including database management.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BaseMongoController_1 = require("./BaseMongoController");
const Sentry = __importStar(require("@sentry/node"));
const DATABASE_CONNECTION_NOT_AVAILABLE = 'Database connection not available';
class AdminController extends BaseMongoController_1.BaseMongoController {
    constructor() {
        // Admin controller doesn't use a specific model
        super(null, 'Admin');
    }
    /**
     * Get all collections in the database
     */
    async getCollections() {
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error(DATABASE_CONNECTION_NOT_AVAILABLE);
            }
            const collections = await db.listCollections().toArray();
            return collections.map((col) => col.name);
        }
        catch (error) {
            Sentry.captureException(error);
            if (error instanceof Error && error.message === DATABASE_CONNECTION_NOT_AVAILABLE) {
                throw error;
            }
            throw new Error('Error fetching collections');
        }
    }
    /**
     * Get documents from a collection with optional search
     * Optimized with pagination and field projection
     */
    async getCollectionDocuments(collectionName, options = {}) {
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error(DATABASE_CONNECTION_NOT_AVAILABLE);
            }
            const collection = db.collection(collectionName);
            const { keyword, page = 1, limit = 100, select } = options;
            let query = {};
            // Build search filter if keyword provided
            if (keyword) {
                const sampleDoc = await collection.findOne({});
                if (sampleDoc) {
                    const stringFields = Object.keys(sampleDoc).filter((key) => typeof sampleDoc[key] === 'string');
                    if (stringFields.length > 0) {
                        query = {
                            $or: stringFields.map((field) => ({
                                [field]: { $regex: keyword, $options: 'i' },
                            })),
                        };
                    }
                }
            }
            // Build projection
            const projection = select
                ? select.reduce((acc, field) => ({ ...acc, [field]: 1 }), {})
                : null;
            // Execute query with pagination
            const skip = (page - 1) * limit;
            const findOptions = projection ? { projection } : {};
            const documents = await collection
                .find(query, findOptions)
                .skip(skip)
                .limit(limit)
                .toArray();
            return documents;
        }
        catch (error) {
            Sentry.captureException(error);
            if (error instanceof Error && error.message === DATABASE_CONNECTION_NOT_AVAILABLE) {
                throw error;
            }
            throw new Error('Error fetching documents from collection');
        }
    }
    /**
     * Get collection statistics using countDocuments
     */
    async getCollectionStats(collectionName) {
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error(DATABASE_CONNECTION_NOT_AVAILABLE);
            }
            const stats = await db.command({
                collStats: collectionName,
            });
            return {
                count: stats.count || 0,
                size: stats.size || 0,
                avgDocSize: stats.avgObjSize || 0,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            if (error instanceof Error && error.message === DATABASE_CONNECTION_NOT_AVAILABLE) {
                throw error;
            }
            throw new Error('Error fetching collection statistics');
        }
    }
    /**
     * Clear all documents from a collection (dangerous - use with caution)
     */
    async clearCollection(collectionName) {
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error(DATABASE_CONNECTION_NOT_AVAILABLE);
            }
            const result = await db.collection(collectionName).deleteMany({});
            return result.deletedCount || 0;
        }
        catch (error) {
            Sentry.captureException(error);
            if (error instanceof Error && error.message === DATABASE_CONNECTION_NOT_AVAILABLE) {
                throw error;
            }
            throw new Error('Error clearing collection');
        }
    }
    /**
     * Get database connection status
     */
    getConnectionStatus() {
        return {
            connected: mongoose_1.default.connection.readyState === 1,
            readyState: mongoose_1.default.connection.readyState,
            name: mongoose_1.default.connection.name,
        };
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
//# sourceMappingURL=AdminController.js.map