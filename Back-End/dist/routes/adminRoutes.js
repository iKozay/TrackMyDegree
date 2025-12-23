"use strict";
// src/routes/adminRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("@controllers/adminController/adminController"); // Import controller methods
const JWTAccessMiddleware_1 = require("@middleware/JWTAccessMiddleware");
const authMiddleware_1 = require("@middleware/authMiddleware");
const router = express_1.default.Router();
//* Middleware
router.use(authMiddleware_1.verifyAuth);
router.use(JWTAccessMiddleware_1.AdminCheck);
//* Route handler
// Route to get all tables
router.post('/tables', adminController_1.getTables);
// Route to get records from a specific table with optional keyword filtering
router.post('/tables/:tableName', adminController_1.getTableRecords);
// NEW: Route to seed data
router.post('/seed-data', adminController_1.seedSoenDegree);
router.post('/fetch-backups', adminController_1.listBackups);
router.post('/restore-backup', adminController_1.restoreBackup);
router.post('/create-backup', adminController_1.createBackup);
router.post('/delete-backup', adminController_1.deleteBackup);
exports.default = router;
