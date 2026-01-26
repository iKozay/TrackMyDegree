"use strict";
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
exports.adminController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const backup_1 = require("../../services/backup");
exports.adminController = {
    createBackup(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileName = yield (0, backup_1.createBackup)();
                res.json({ message: 'Backup created', data: fileName });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                res.status(500).json({ error: message });
            }
        });
    },
    restoreBackup(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { file } = req.body;
                yield (0, backup_1.restoreBackup)(file);
                res.json({ message: 'Backup restored successfully' });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                res.status(500).json({ error: message });
            }
        });
    },
    listBackups(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const backups = yield (0, backup_1.listBackups)();
                res.json({ success: true, data: backups });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                res.status(500).json({ error: message });
            }
        });
    },
    deleteBackup(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { file } = req.body;
                yield (0, backup_1.deleteBackup)(file);
                res.json({ message: 'Backup deleted' });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                res.status(500).json({ error: message });
            }
        });
    },
    getCollections(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const db = mongoose_1.default.connection.db;
                if (!db) {
                    res.status(500).json({
                        success: false,
                        message: 'Database connection not available',
                        data: null,
                    });
                    return;
                }
                const collections = yield db.listCollections().toArray();
                const collectionNames = collections.map((col) => col.name);
                res.status(200).json({ success: true, data: collectionNames });
            }
            catch (err) {
                console.error('Error fetching collections:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching documents from collection',
                    data: err instanceof Error ? err.message : err,
                });
            }
        });
    },
    getCollectionDocuments(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const { collectionName } = req.params;
            const { keyword } = req.query;
            try {
                const db = mongoose_1.default.connection.db;
                if (!db) {
                    res.status(500).json({
                        success: false,
                        message: 'Database connection not available',
                        data: null,
                    });
                    return;
                }
                const collection = db.collection(collectionName);
                let filter = {};
                if (keyword && typeof keyword === 'string') {
                    // Build filter for string fields
                    const sampleDoc = yield collection.findOne({});
                    if (sampleDoc) {
                        const stringFields = Object.keys(sampleDoc).filter((key) => typeof sampleDoc[key] === 'string');
                        if (stringFields.length > 0) {
                            filter = {
                                $or: stringFields.map((field) => ({
                                    [field]: { $regex: keyword, $options: 'i' },
                                })),
                            };
                        }
                    }
                }
                const documents = yield collection.find(filter).toArray();
                res.status(200).json({ success: true, data: documents });
            }
            catch (err) {
                console.error('Error fetching collection documents:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching documents from collection',
                    data: err instanceof Error ? err.message : err,
                });
            }
        });
    },
};
