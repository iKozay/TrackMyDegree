import express, { Request, Response } from 'express';
import pdfParsingController, {
  uploadMiddleware,
} from '../controllers/pdfParsingController';

import { assignJobId } from '../middleware/assignJobId';
import { uploadWithJobId } from '../middleware/uploadWithJobId';

import { uploadController } from '../controllers/uploadController';

const router = express.Router();

/**
 * @route   POST /api/upload/parse
 * @desc    Parse uploaded Document PDF
 */
router.post('/parse', uploadMiddleware, (req: Request, res: Response) =>
  pdfParsingController.parseDocument(req, res),
);

router.post(
  '/file',
  assignJobId,
  uploadWithJobId.single('file'),
  uploadController,
);

router.post('/form', assignJobId, uploadController);

export default router;
