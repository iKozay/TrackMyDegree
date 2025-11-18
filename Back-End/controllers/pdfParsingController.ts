import { Request, Response } from 'express';
import { TranscriptParser } from '@utils/transcriptParser';
import HTTP from '@utils/httpCodes';
import type { ParsePDFResponse } from '../types/transcript';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

import pdfParse from 'pdf-parse';
import { AcceptanceLetterParser } from '@utils/acceptanceLetterParser';
import { randomUUID } from 'node:crypto';

const unlinkAsync = promisify(fs.unlink);

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
    let tempFilePath: string | null = null;

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
        // Write buffer to temporary file for Python parser
        tempFilePath = path.join(
          '/tmp',
          `transcript_${Date.now()}_${randomUUID()}.pdf`,
        );
        fs.writeFileSync(tempFilePath, req.file.buffer);

        const parser = new TranscriptParser();
        const transcriptData = await parser.parseFromFile(tempFilePath);
        data = unifyParsedData(transcriptData);
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
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await unlinkAsync(tempFilePath);
        } catch (cleanupError) {
          // Log but don't throw - cleanup errors shouldn't affect the response
          console.error('Failed to cleanup temp file:', cleanupError);
        }
      }
    }
  }
}
//temporary function to unify the data between acceptance letter and transcript
//when a common interface is defined this function will be removed
function unifyParsedData(parsedData: any) {
  let details = {};
  if (parsedData.programHistory && parsedData.programHistory.length > 0) {
    // Extract degree ID from program history
    let degreeName = `${parsedData.programHistory[parsedData.programHistory.length - 1]?.degreeType}, ${parsedData.programHistory[parsedData.programHistory.length - 1]?.major}`;
    const coop = degreeName.indexOf(' (Co-op)');
    degreeName = coop === -1 ? degreeName : degreeName.slice(0, coop);
    details = {
      degreeConcentration: degreeName,
      coopProgram: coop !== -1,
      minimumProgramLength:
        parsedData.programHistory[parsedData.programHistory.length - 1]
          ?.minCreditsRequired || null,
      // extendedCreditProgram: parsedData.extendedCredits || false,
      //deficienciesCourses: parsedData.deficiencyCourses,
    };
  }
  // Transform new parsed data to match the old format (matching matchCoursesToTerms output)
  const extractedCourses: {
    term: string;
    courses: string[];
    grade: string | null;
  }[] = [];

  if (!parsedData?.terms.length && !parsedData?.transferCredits.length) {
    return { extractedCourses, details };
  }

  // Handle transfer credits as exempted courses
  if (parsedData.transferCredits.length > 0) {
    // Get the earliest year from transfer credits or use a default
    const exemptYear = parsedData.terms[0].year;
    extractedCourses.push({
      term: `Exempted ${exemptYear}`,
      courses: parsedData.transferCredits.map((tc: any) =>
        tc.courseCode.replaceAll(/\s+/g, ''),
      ),
      grade: 'EX',
    });
  }

  for (const term of parsedData.terms) {
    const termName = `${term.term} ${term.year}`;
    extractedCourses.push({
      term: termName,
      courses: term.courses.map((tc: any) =>
        tc.courseCode.replaceAll(/\s+/g, ''),
      ),
      grade: term.termGPA,
    });
  }

  return { extractedCourses, details };
}

const pdfParsingController = new PDFParsingController();
export const uploadMiddleware = upload.single('file');
export default pdfParsingController;
