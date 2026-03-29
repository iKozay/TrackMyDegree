import { Router, Request, Response } from 'express';
import {  getJobResult } from '../lib/cache';
import { validateCoopTimeline } from '../services/coop/coopvalidationService';
import { buildFilledCoopSequenceForm } from '../services/coop/coopFormService';
import { CachedJobResult } from '../controllers/jobController';
import { BadRequestError, NotFoundError } from '@utils/errors';
const router = Router();

/**
 * GET /api/coop/validate/:jobId
 */
router.get('/validate/:jobId', async (req: Request, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      throw new BadRequestError('jobId is required');
    }

      // get result from cache
      const cachedTimeline = await getJobResult(jobId as string);
  

    if (!cachedTimeline) {
      throw new NotFoundError('Timeline not found in cache');
    }

    const timeline = cachedTimeline.payload.data;

    const result = validateCoopTimeline(timeline);

    return res.status(200).json(result);
});

/**
 * GET /api/coop/form/:jobId
 * Auto-fill and download co-op sequence change request form (PDF).
 */
router.get('/form/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const cachedTimeline = await getJobResult<CachedJobResult>(jobId as string);

    if (!cachedTimeline) {
      return res.status(404).json({ error: 'Timeline not found in cache' });
    }

    const timeline = cachedTimeline.payload.data;
    const { pdfBytes, notes } = await buildFilledCoopSequenceForm(timeline);

    const safeFilename = `sequence-change-request-${jobId}.pdf`;

    // Expose custom headers so browser clients can read guidance notes.
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Coop-Form-Notes',
    );
    res.setHeader('X-Coop-Form-Notes', encodeURIComponent(JSON.stringify(notes)));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate co-op form PDF' });
  }
});

export default router;
