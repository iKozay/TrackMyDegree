import { Router } from 'express';
import transcriptController, { uploadMiddleware } from '../controllers/transcriptController/transcriptController';

const router = Router();

/**
 * @route   POST /api/transcript/parse
 * @desc    Parse uploaded transcript PDF
 * @access  Private (add authentication middleware as needed)
 */
router.post('/parse', uploadMiddleware, (req, res) => 
  transcriptController.parseTranscript(req, res)
);

/**
 * @route   POST /api/transcript/validate
 * @desc    Validate transcript format
 * @access  Private (add authentication middleware as needed)
 */
router.post('/validate', uploadMiddleware, (req, res) =>
  transcriptController.validateTranscript(req, res)
);

export default router;

