/**
 * Course Pool Routes
 *
 * Handles course pool operations
 */

import HTTP from '@Util/HTTPCodes';
import express, { Request, Response } from 'express';
import { coursepoolController } from '@controllers/mondoDBControllers';

const router = express.Router();

// ==========================
// COURSE POOL ROUTES
// ==========================

const INTERNAL_SERVER_ERROR = 'Internal server error';

/**
 * GET /coursepool/:id - Get course pool by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const coursePool = await coursepoolController.getCoursePool(req.params.id);
        if (!coursePool) {
            return res.status(HTTP.NOT_FOUND).json({ error: 'Course pool not found' });
        }
        return res.status(HTTP.OK).json(coursePool);
    } catch (error) {
        console.error('Error fetching course pool:', error);
        return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});

/**
 * GET /coursepool/ - Get all course pools
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const coursePools = await coursepoolController.getAllCoursePools();
        return res.status(HTTP.OK).json(coursePools);
    } catch (error) {
        console.error('Error fetching course pools:', error);
        return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
    }
});

export default router;