// src/routes/adminRoutes.ts

import express from 'express';
import { getTables, getTableRecords } from '@controllers/adminController/adminController'; // Import controller methods

const router = express.Router();

// Route to get all tables
router.post('/tables', getTables);

// Route to get records from a specific table with optional keyword filtering
router.post('/tables/:tableName', getTableRecords);

export default router;
