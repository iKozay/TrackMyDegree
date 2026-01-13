import HTTP from '@utils/httpCodes';
import express, { Request, Response } from 'express';
import { degreeAuditController } from '@controllers/degreeAuditController';
import mongoose from 'mongoose';

const router = express.Router();

const INTERNAL_SERVER_ERROR = 'Internal server error';
const INVALID_ID_FORMAT = 'Invalid id format';

/**
 * @openapi
 * tags:
 *   - name: Degree Audit
 *     description: Endpoints for generating and retrieving degree audit reports
 */

/**
 * @openapi
 * /audit/timeline/{timelineId}:
 *   get:
 *     summary: Generate degree audit for a specific timeline
 *     description: Generates a comprehensive degree audit report based on a specific timeline.
 *     tags: [Degree Audit]
 *     parameters:
 *       - in: path
 *         name: timelineId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the timeline to audit
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the user who owns the timeline
 *     responses:
 *       200:
 *         description: Degree audit generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     program: { type: string }
 *                     advisor: { type: string }
 *                     gpa: { type: string }
 *                     admissionTerm: { type: string }
 *                     expectedGraduation: { type: string }
 *                 progress:
 *                   type: object
 *                   properties:
 *                     completed: { type: number }
 *                     inProgress: { type: number }
 *                     remaining: { type: number }
 *                     total: { type: number }
 *                     percentage: { type: number }
 *                 notices:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       type: { type: string, enum: [warning, info, success] }
 *                       message: { type: string }
 *                 requirements:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       title: { type: string }
 *                       status: { type: string, enum: [Complete, 'In Progress', Incomplete, 'Not Started', Missing] }
 *                       missingCount: { type: number }
 *                       creditsCompleted: { type: number }
 *                       creditsTotal: { type: number }
 *                       courses:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             code: { type: string }
 *                             title: { type: string }
 *                             credits: { type: number }
 *                             grade: { type: string }
 *                             status: { type: string, enum: [Completed, 'In Progress', Missing, 'Not Started'] }
 *                             term: { type: string }
 *       400:
 *         description: Invalid timeline ID or missing user ID
 *       401:
 *         description: Unauthorized - timeline does not belong to user
 *       404:
 *         description: Timeline not found
 *       500:
 *         description: Internal server error
 */
router.get('/timeline/:timelineId', async (req: Request, res: Response) => {
  try {
    const timelineId = req.params.timelineId as string;
    const userId = req.query.userId as string | undefined;

    if (!timelineId || !mongoose.Types.ObjectId.isValid(timelineId)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: `${INVALID_ID_FORMAT}: timelineId`,
      });
    }

    if (!userId) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: 'User ID is required as a query parameter',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: `${INVALID_ID_FORMAT}: userId`,
      });
    }

    const audit = await degreeAuditController.getAuditByTimeline(
      timelineId,
      userId,
    );
    return res.status(HTTP.OK).json(audit);
  } catch (error) {
    console.error('Error in GET /audit/timeline/:timelineId', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(HTTP.NOT_FOUND).json({ error: error.message });
      }
      if (error.message.includes('Unauthorized')) {
        return res.status(HTTP.UNAUTHORIZED).json({ error: error.message });
      }
    }

    return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

/**
 * @openapi
 * /audit/user/{userId}:
 *   get:
 *     summary: Generate degree audit for a user's most recent timeline
 *     description: Generates a comprehensive degree audit report based on the user's most recently updated timeline.
 *     tags: [Degree Audit]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: Degree audit generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DegreeAuditData'
 *       400:
 *         description: Invalid user ID format
 *       404:
 *         description: No timeline found for this user
 *       500:
 *         description: Internal server error
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(HTTP.BAD_REQUEST).json({
        error: `${INVALID_ID_FORMAT}: userId`,
      });
    }

    const audit = await degreeAuditController.getAuditForUser(userId);
    return res.status(HTTP.OK).json(audit);
  } catch (error) {
    console.error('Error in GET /audit/user/:userId', error);

    if (error instanceof Error) {
      if (
        error.message.includes('not found') ||
        error.message.includes('No timeline')
      ) {
        return res.status(HTTP.NOT_FOUND).json({ error: error.message });
      }
    }

    return res.status(HTTP.SERVER_ERR).json({ error: INTERNAL_SERVER_ERROR });
  }
});

export default router;
