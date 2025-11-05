// src/routes/adminRoutes.ts

import express from 'express';
import {
  seedSoenDegree,
  getTables,
  getTableRecords,
  listBackups,
  restoreBackup,
  createBackup,
  deleteBackup,
} from '@controllers/adminController/adminController'; // Import controller methods
import {
  authMiddleware,
  adminCheckMiddleware,
} from '@middleware/authMiddleware';

const router = express.Router();

//* Middleware
router.use(authMiddleware);
router.use(adminCheckMiddleware);

//* Route handler
// Route to get all tables
router.post('/tables', getTables);

// Route to get records from a specific table with optional keyword filtering
router.post('/tables/:tableName', getTableRecords);

// Route to seed data (SQL Server)
router.post('/seed-data', seedSoenDegree);

router.post('/fetch-backups', listBackups);

router.post('/restore-backup', restoreBackup);

router.post('/create-backup', createBackup);

router.post('/delete-backup', deleteBackup);

export default router;
