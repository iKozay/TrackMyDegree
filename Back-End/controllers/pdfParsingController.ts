import { Request, Response } from 'express';
import HTTP from '@utils/httpCodes';
import type { ParsePDFResponse } from '../types/transcript';
import multer from 'multer';
import { parseFile } from "@services/parsingService";

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
 * Controller for handling pdf parsing operations
 */
class PDFParsingController {
  /**
   * Parse uploaded PDF
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

      let data = await parseFile(req.file?.buffer)
  
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
