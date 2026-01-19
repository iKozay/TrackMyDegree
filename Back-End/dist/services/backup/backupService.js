"use strict";
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
exports.createBackup = createBackup;
exports.listBackups = listBackups;
exports.restoreBackup = restoreBackup;
exports.deleteBackup = deleteBackup;
const mongoose_1 = __importDefault(require("mongoose"));
const node_fs_1 = __importDefault(require("node:fs"));
var fsPromises = node_fs_1.default.promises;
const node_path_1 = __importDefault(require("node:path"));
const Sentry = __importStar(require("@sentry/node"));
const seedService_1 = require("../seed/seedService");
const BACKUP_DIR = (process.env.BACKUP_DIR || node_path_1.default.join(__dirname, '../../backups')).trim();
// Collections to backup (USER DATA ONLY - excludes courses and degrees)
const USER_DATA_COLLECTIONS = ['users', 'timelines', 'feedback'];
// -------------------------------------
// Ensure Backup Directory Exists
// -------------------------------------
async function ensureBackupDir() {
    if (!node_fs_1.default.existsSync(BACKUP_DIR)) {
        await fsPromises.mkdir(BACKUP_DIR, { recursive: true });
        console.log(`Created backup directory: ${BACKUP_DIR}`);
    }
}
// -------------------------------------
// Create Backup (User Data Only)
// -------------------------------------
async function createBackup() {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            throw new Error('No database connection available');
        await ensureBackupDir();
        const backupData = {};
        // Only backup user data collections
        for (const collectionName of USER_DATA_COLLECTIONS) {
            try {
                const collection = db.collection(collectionName);
                const data = await collection.find().toArray();
                backupData[collectionName] = data;
                console.log(`Backed up ${data.length} documents from ${collectionName}`);
            }
            catch (error) {
                // log error for each collection
                console.warn(`Error accessing collection ${collectionName}:`, error.message);
                backupData[collectionName] = [];
            }
        }
        const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
        const fileName = `backup-${timestamp}.json`;
        const filePath = node_path_1.default.join(BACKUP_DIR, fileName);
        await fsPromises.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`Backup created successfully at: ${filePath}`);
        return fileName;
    }
    catch (error) {
        Sentry.captureException(error);
        console.error('Error creating backup:', error);
        throw error;
    }
}
// -------------------------------------
// List Available Backups
// -------------------------------------
async function listBackups() {
    try {
        await ensureBackupDir();
        const files = await fsPromises.readdir(BACKUP_DIR);
        return files.filter((file) => file.endsWith('.json'));
    }
    catch (error) {
        Sentry.captureException(error);
        console.error('Error listing backups:', error);
        throw error;
    }
}
// -------------------------------------
// Restore Backup
// Step 1: Clear ALL collections
// Step 2: Re-seed Courses & Degrees from files
// Step 3: Restore User Data from backup
// -------------------------------------
async function restoreBackup(backupFileName) {
    try {
        const filePath = node_path_1.default.join(BACKUP_DIR, backupFileName);
        if (!node_fs_1.default.existsSync(filePath)) {
            throw new Error(`Backup file not found: ${filePath}`);
        }
        const db = mongoose_1.default.connection.db;
        if (!db)
            throw new Error('No database connection available');
        // Read backup data
        const backupContent = await fsPromises.readFile(filePath, 'utf-8');
        const backupData = JSON.parse(backupContent);
        console.log('[RESTORE] Step 1: Clearing all collections...');
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
            await db.collection(col.name).deleteMany({});
            console.log(`Cleared collection: ${col.name}`);
        }
        console.log('[RESTORE] Step 2: Re-seeding Courses & Degrees from files...');
        await (0, seedService_1.seedDatabase)();
        console.log('[RESTORE] Step 3: Restoring user data from backup...');
        for (const collectionName of USER_DATA_COLLECTIONS) {
            const docs = backupData[collectionName];
            if (!docs || !Array.isArray(docs) || docs.length === 0) {
                console.log(`No data to restore for collection: ${collectionName}`);
                continue;
            }
            try {
                const collection = db.collection(collectionName);
                await collection.insertMany(docs);
                console.log(`Restored ${docs.length} documents to ${collectionName}`);
            }
            catch (error) {
                console.error(`Error restoring collection ${collectionName}:`, error);
                throw error;
            }
        }
        console.log(`[RESTORE] Backup restored successfully from: ${backupFileName}`);
    }
    catch (error) {
        Sentry.captureException(error);
        console.error('Error restoring backup:', error);
        throw error;
    }
}
// -------------------------------------
// Delete Backup
// -------------------------------------
async function deleteBackup(backupFileName) {
    try {
        const filePath = node_path_1.default.join(BACKUP_DIR, backupFileName);
        if (!node_fs_1.default.existsSync(filePath)) {
            throw new Error(`Backup file not found: ${backupFileName}`);
        }
        await fsPromises.unlink(filePath);
        console.log(`Backup deleted: ${backupFileName}`);
    }
    catch (error) {
        Sentry.captureException(error);
        console.error('Error deleting backup:', error);
        throw error;
    }
}
//# sourceMappingURL=backupService.js.map