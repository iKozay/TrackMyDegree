"use strict";
/**
 * Admin Routes
 *
 * Handles admin operations including database management
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
// ADMIN ROUTES
// ==========================
const INTERNAL_SERVER_ERROR = 'Internal server error';
const COLLECTION_NAME_REQUIRED = 'Collection name is required';
const NOT_AVAILABLE = 'not available';
/**
 * GET /admin/collections - Get all collections
 */
router.get('/collections', async (req, res) => {
    try {
        const collections = await mondoDBControllers_1.adminController.getCollections();
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Collections retrieved successfully',
            collections,
        });
    }
    catch (error) {
        console.error('Error in GET /admin/collections', error);
        if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /admin/collections/:collectionName/documents - Get documents from collection
 */
router.get('/collections/:collectionName/documents', async (req, res) => {
    try {
        const { collectionName } = req.params;
        const { keyword, page, limit } = req.query;
        if (!collectionName) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: COLLECTION_NAME_REQUIRED,
            });
            return;
        }
        const documents = await mondoDBControllers_1.adminController.getCollectionDocuments(collectionName, {
            keyword: keyword,
            page: page ? parseInt(page) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        });
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Documents retrieved successfully',
            documents,
        });
    }
    catch (error) {
        console.error('Error in GET /admin/collections/:collectionName/documents', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
/**
 * GET /admin/collections/:collectionName/stats - Get collection statistics
 */
router.get('/collections/:collectionName/stats', async (req, res) => {
    try {
        const { collectionName } = req.params;
        if (!collectionName) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: COLLECTION_NAME_REQUIRED,
            });
            return;
        }
        const stats = await mondoDBControllers_1.adminController.getCollectionStats(collectionName);
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Statistics retrieved successfully',
            stats,
        });
    }
    catch (error) {
        console.error('Error in GET /admin/collections/:collectionName/stats', error);
        if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * DELETE /admin/collections/:collectionName/clear - Clear collection
 */
router.delete('/collections/:collectionName/clear', async (req, res) => {
    try {
        const { collectionName } = req.params;
        if (!collectionName) {
            res.status(HTTPCodes_1.default.BAD_REQUEST).json({
                error: COLLECTION_NAME_REQUIRED,
            });
            return;
        }
        const count = await mondoDBControllers_1.adminController.clearCollection(collectionName);
        res.status(HTTPCodes_1.default.OK).json({
            message: `Collection cleared successfully`,
            deletedCount: count,
        });
    }
    catch (error) {
        console.error('Error in DELETE /admin/collections/:collectionName/clear', error);
        if (error instanceof Error && error.message.includes(NOT_AVAILABLE)) {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: error.message });
        }
        else {
            res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
        }
    }
});
/**
 * GET /admin/connection-status - Get database connection status
 */
router.get('/connection-status', async (req, res) => {
    try {
        const status = await mondoDBControllers_1.adminController.getConnectionStatus();
        res.status(HTTPCodes_1.default.OK).json({
            message: 'Connection status retrieved successfully',
            ...status,
        });
    }
    catch (error) {
        console.error('Error in GET /admin/connection-status', error);
        res.status(HTTPCodes_1.default.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map