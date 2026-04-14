import express from 'express';

import { assignJobId } from '../middleware/assignJobId';
import { uploadWithJobId } from '../middleware/uploadWithJobId';

import { uploadController } from '../controllers/uploadController';

const router = express.Router();

router.post(
  '/file',
  assignJobId,
  uploadWithJobId.single('file'),
  uploadController,
);

router.post('/form', assignJobId, uploadController);

export default router;
