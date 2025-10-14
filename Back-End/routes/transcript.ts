import express, { Request, Response } from 'express';
import transcriptController, {
  uploadMiddleware,
} from '../controllers/transcriptController/transcriptController';

const router = express.Router();

/**
 * @route   POST /api/transcript/parse
 * @desc    Parse uploaded transcript PDF
 */
router.post('/parse', uploadMiddleware, (req: Request, res: Response) =>
  transcriptController.parseTranscript(req, res),
);

export default router;
