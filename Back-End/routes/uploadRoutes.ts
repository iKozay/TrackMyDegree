import express, { Request, Response } from 'express';
import pdfParsingController, {
  uploadMiddleware,
} from '../controllers/pdfParsingController';

const router = express.Router();

/**
 * @route   POST /api/upload/parse
 * @desc    Parse uploaded Document PDF
 */
router.post('/parse', uploadMiddleware, (req: Request, res: Response) =>
  pdfParsingController.parseDocument(req, res),
);

export default router;
