import { Request, Response } from 'express';
import { TranscriptParser } from '@Util/transcriptParser';
import HTTP from '@Util/HTTPCodes';
import type { ParseTranscriptResponse, ValidateTranscriptResponse } from '@shared/types';
import multer from 'multer';
import path from 'path';

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 DEBUG: Multer fileFilter called');
    console.log('🔍 DEBUG: File fieldname:', file.fieldname);
    console.log('🔍 DEBUG: File originalname:', file.originalname);
    console.log('🔍 DEBUG: File mimetype:', file.mimetype);
    console.log('🔍 DEBUG: File size:', file.size);
    
    if (file.mimetype === 'application/pdf') {
      console.log('✅ DEBUG: PDF file accepted by multer');
      cb(null, true);
    } else {
      console.log('❌ DEBUG: File rejected by multer - not a PDF');
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
   * @access Private (should be authenticated)
   */
  async parseTranscript(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 DEBUG: parseTranscript called');
      console.log('🔍 DEBUG: Request body keys:', Object.keys(req.body || {}));
      console.log('🔍 DEBUG: Request file:', req.file ? 'File present' : 'No file');
      console.log('🔍 DEBUG: Request headers:', req.headers);
      
      if (!req.file) {
        console.log('❌ DEBUG: No file uploaded');
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      console.log(`📄 DEBUG: Parsing transcript: ${req.file.originalname}`);
      console.log(`📄 DEBUG: File size: ${req.file.size} bytes`);
      console.log(`📄 DEBUG: File mimetype: ${req.file.mimetype}`);

      console.log('🔍 DEBUG: Creating TranscriptParser');
      const parser = new TranscriptParser({
        validateCourseCode: true,
        extractGPA: true,
        extractTermInfo: true,
      });

      console.log('🔍 DEBUG: Starting to parse from buffer');
      // Parse from buffer
      const transcript = await parser.parseFromBuffer(req.file.buffer);
      console.log('🔍 DEBUG: Parsing completed successfully');

      // Calculate additional statistics
      const totalCourses = transcript.terms.reduce(
        (sum, term) => sum + term.courses.length,
        0
      );

      const completedCourses = transcript.terms
        .flatMap((term) => term.courses)
        .filter((course) => course.grade !== 'IP' && course.grade !== 'W');

      const totalCreditsEarned = completedCourses.reduce(
        (sum, course) => sum + course.credits,
        0
      );

      console.log('🔍 DEBUG: Creating response object');
      const response: ParseTranscriptResponse = {
        success: true,
        message: 'Transcript parsed successfully',
        data: {
          ...transcript,
          statistics: {
            totalCourses,
            completedCourses: completedCourses.length,
            totalCreditsEarned,
            transferCredits: transcript.transferCredits.length,
          },
        },
      };

      console.log('🔍 DEBUG: Sending successful response');
      res.status(HTTP.OK).json(response);
    } catch (error) {
      console.error('❌ DEBUG: Error parsing transcript:', error);
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ DEBUG: Error name:', error instanceof Error ? error.name : 'Unknown error type');

      res.status(HTTP.SERVER_ERR).json({
        success: false,
        message: 'Failed to parse transcript',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Validate transcript format without full parsing
   * @route POST /api/transcript/validate
   * @access Private
   */
  async validateTranscript(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Quick validation: check if it's a valid PDF and has expected content
      const fileBuffer = req.file.buffer;
      const header = fileBuffer.toString('utf-8', 0, 5);

      if (header !== '%PDF-') {
        res.status(HTTP.BAD_REQUEST).json({
          success: false,
          message: 'Invalid PDF file',
        });
        return;
      }

      // Try to parse student info only for quick validation
      const parser = new TranscriptParser();
      const transcript = await parser.parseFromBuffer(fileBuffer);

      const isValid = Boolean(
        transcript.studentInfo.studentId || transcript.studentInfo.studentName
      );

      const response: ValidateTranscriptResponse = {
        success: true,
        valid: isValid,
        message: isValid
          ? 'Valid transcript format'
          : 'Could not extract student information',
        preview: {
          studentName: transcript.studentInfo.studentName,
          studentId: transcript.studentInfo.studentId,
        },
      };

      res.status(HTTP.OK).json(response);
    } catch (error) {
      console.error('❌ Error validating transcript:', error);

      res.status(HTTP.SERVER_ERR).json({
        success: false,
        message: 'Failed to validate transcript',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Export controller instance and multer upload middleware
const transcriptController = new TranscriptController();
export const uploadMiddleware = upload.single('transcript');
export default transcriptController;

