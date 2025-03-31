// src/routes/adminRoutes.ts

import express from 'express';
import {
  seedSoenDegree,
  getTables,
  getTableRecords,
} from '@controllers/adminController/adminController'; // Import controller methods
import { AdminCheck } from '@middleware/JWTAccessMiddleware';
import { verifyAuth } from '@middleware/authMiddleware';

const router = express.Router();

//* Middleware
router.use(verifyAuth);
router.use(AdminCheck);

//* Route handler
// Route to get all tables
router.post('/tables', getTables);

// Route to get records from a specific table with optional keyword filtering
router.post('/tables/:tableName', getTableRecords);

// NEW: Route to seed data
router.post('/seed-data', seedSoenDegree);

export default router;
