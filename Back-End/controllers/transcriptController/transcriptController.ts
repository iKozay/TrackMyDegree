import { Request, Response } from 'express';
import { TranscriptParser } from '@Util/transcriptParser';
import HTTP from '@Util/HTTPCodes';
import type { ParseTranscriptResponse } from '@shared/types';
import multer from 'multer';

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

/**
 * Controller for handling transcript parsing operations
 */
class TranscriptController {
  /**
   * Parse uploaded transcript PDF
   * @route POST /api/transcript/parse
   */
  async parseTranscript(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }
      const parser = new TranscriptParser();

      const transcript = await parser.parseFromBuffer(req.file.buffer);

      const response: ParseTranscriptResponse = {
        success: true,
        message: 'Transcript parsed successfully',
        data: transcript,
      };

      res.status(HTTP.OK).json(response);
    } catch (error) {
      res.status(HTTP.SERVER_ERR).json({
        success: false,
        message: 'Failed to parse transcript',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

const transcriptController = new TranscriptController();
export const uploadMiddleware = upload.single('transcript');
export default transcriptController;

