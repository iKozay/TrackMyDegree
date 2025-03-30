// src/routes/adminRoutes.ts

import express from 'express';
import { getTables, getTableRecords } from '@controllers/adminController/adminController'; // Import controller methods
import { seedSoenDegree } from '@controllers/adminController/adminController';
import {AdminCheck} from '@middleware/JWTAccessMiddleware';

const router = express.Router();

router.use(AdminCheck);

// Route to get all tables
router.post('/tables', getTables);

// Route to get records from a specific table with optional keyword filtering
router.post('/tables/:tableName', getTableRecords);

// NEW: Route to seed data
router.post('/seed-data', seedSoenDegree);

export default router;
