import { Router } from 'express';
import transcriptController, { uploadMiddleware } from '../controllers/transcriptController/transcriptController';

const router = Router();

/**
 * @route   POST /api/transcript/parse
 * @desc    Parse uploaded transcript PDF
 */
router.post('/parse', uploadMiddleware, (req, res) => 
  transcriptController.parseTranscript(req, res)
);

export default router;

