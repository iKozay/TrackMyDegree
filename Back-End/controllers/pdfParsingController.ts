import { Request, Response } from 'express';
import { parseTranscript } from '../utils/pythonUtilsApi';
import HTTP from '@utils/httpCodes';
import type { ParsePDFResponse } from '../types/transcript';
import multer from 'multer';

import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';

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
class PDFParsingController {
  /**
   * Parse uploaded transcript PDF
   * @route POST /api/upload/parse
   */
  async parseDocument(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Step 1: Use pdf-parse to detect document type and parse acceptance letters
      const pdfParseData = await pdfParse(req.file.buffer);
      const cleanText = pdfParseData.text;
      let data;

      if (!cleanText || cleanText.length === 0) {
        throw new Error('No text extracted from PDF.');
      }

      // Check if the text contains keywords specific to acceptance letters
      if (cleanText.toUpperCase().includes('OFFER OF ADMISSION')) {
        const parser = new AcceptanceLetterParser();
        data = parser.parse(cleanText);
      }
      // Check if the text contains keywords specific to transcripts
      else if (cleanText.toLowerCase().includes('student record')) {
        // Pass PDF buffer directly to Python parser
        data = await parseTranscript(req.file.buffer);
      } else {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message:
            'Uploaded PDF is neither a valid transcript nor an acceptance letter.',
        });
        return;
      }

      const response: ParsePDFResponse = {
        success: true,
        message: 'Document parsed successfully',
        data: data,
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

const pdfParsingController = new PDFParsingController();
export const uploadMiddleware = upload.single('file');
export default pdfParsingController;
